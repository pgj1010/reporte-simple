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
export const cdsCli = (...args: string[]) =>
  promisify(execFile)('cds', args, { cwd: raiz, env: { ...process.env, CDS_TYPESCRIPT: 'false' } });
