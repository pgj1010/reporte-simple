// Utilidades comunes de los tests (no es un archivo de test: no termina en .test.ts).
import cds from '@sap/cds';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const raiz = import.meta.dirname + '/..';

/** Levanta ReporteService con el servicio remoto simulado y datos de test/data (D6/D13). */
export const iniciar = () => cds.test('serve', '--project', raiz, '--with-mocks', '--in-memory');

/** Usuario mock autenticado. */
export const alice = { auth: { username: 'alice', password: '' } };

/** Ejecuta una petición y devuelve su código HTTP, también si fue rechazada. */
export async function estado(peticion: Promise<{ status: number }>): Promise<number> {
  try {
    return (await peticion).status;
  } catch (e: any) {
    const status = e.response?.status ?? e.status;
    if (typeof status !== 'number') throw e;
    return status;
  }
}

/** Ejecuta el CLI `cds` (cds-dk global) en la raíz del proyecto, sin tsx (D13). */
export const cdsCli = (args: string[], env: Record<string, string> = {}) =>
  promisify(execFile)('cds', args, { cwd: raiz, env: { ...process.env, CDS_TYPESCRIPT: 'false', ...env } });

/** Ejecuta una petición que debe fallar y devuelve el código HTTP y el código de error OData. */
export async function rechazo(peticion: Promise<unknown>): Promise<{ status: number; code?: string }> {
  try {
    await peticion;
  } catch (e: any) {
    const status = e.response?.status ?? e.status;
    if (typeof status !== 'number') throw e;
    return { status, code: e.response?.data?.error?.code ?? e.code };
  }
  throw new Error('se esperaba que la petición fuera rechazada');
}

/** Llamada MCP (JSON-RPC sobre HTTP) a /mcp/reporte-agent del servidor de `cds.test` (R15, R16);
 *  `usuario` null = sin credenciales. Devuelve el código HTTP y el mensaje JSON-RPC (también si llega por SSE). */
export async function mcpAgente(baseURL: string, usuario: string | null, metodo: string, params: object = {}) {
  const r = await fetch(`${baseURL}/mcp/reporte-agent`, {
    method: 'POST',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: metodo, params }),
    headers: {
      accept: 'application/json, text/event-stream', 'content-type': 'application/json',
      ...(usuario === null ? {} : { authorization: 'Basic ' + btoa(`${usuario}:`) }),
    },
  });
  const texto = await r.text();
  return { status: r.status, mensaje: JSON.parse(texto.match(/^data: (.*)$/m)?.[1] ?? texto) };
}
