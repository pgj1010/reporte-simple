// Utilidades comunes de los tests (no es un archivo de test: no termina en .test.ts).
import cds from '@sap/cds';
import { execFile } from 'node:child_process';
import { promisify, stripVTControlCharacters } from 'node:util';

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

/** Env para procesos hijo cuya salida se compara: sin colores ANSI. En GitHub Actions `cds` colorea
 *  aunque la salida no sea una terminal (`false` → `\x1B[33mfalse\x1B[39m`); FORCE_COLOR=0 gana a un
 *  FORCE_COLOR del entorno y NO_COLOR cubre a las librerías que solo miran esa variable. */
export const SIN_COLOR = { NO_COLOR: '1', FORCE_COLOR: '0' } as const;

/** Quita los códigos ANSI (colores, estilos) de una salida de consola, por si algún proceso los ignora. */
export const sinAnsi = (texto: string) => stripVTControlCharacters(texto);

/** Ejecuta el CLI `cds` (cds-dk global) en la raíz del proyecto, sin tsx (D13) y sin colores
 *  (`SIN_COLOR` en el env y `sinAnsi` sobre stdout/stderr), para comparar su salida tal cual. */
export const cdsCli = async (args: string[], env: Record<string, string> = {}) => {
  const r = await promisify(execFile)('cds', args, {
    cwd: raiz, env: { ...process.env, CDS_TYPESCRIPT: 'false', ...SIN_COLOR, ...env },
  });
  return { stdout: sinAnsi(r.stdout), stderr: sinAnsi(r.stderr) };
};

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
