// R3 — Todo acceso a ReporteService requiere usuario autenticado
// (@requires: 'authenticated-user'). Sin usuario → 401.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const raiz = import.meta.dirname + '/..';
const { GET } = cds.test('serve', '--project', raiz, '--with-mocks', '--in-memory');
const alice = { auth: { username: 'alice', password: '' } };

/** Devuelve el código HTTP, también cuando la petición es rechazada. */
async function estado(url: string, config?: object): Promise<number> {
  try {
    return (await GET(url, config)).status;
  } catch (e: any) {
    const status = e.response?.status ?? e.status;
    if (typeof status !== 'number') throw e;
    return status;
  }
}

const rutas = [
  '/odata/v4/reporte/Conexiones',
  '/odata/v4/reporte/Vuelos',
  '/odata/v4/reporte/Aeropuertos',
  '/odata/v4/reporte/$metadata',
];

describe('R3 — autenticación obligatoria en ReporteService', () => {
  describe('sin usuario → 401', () => {
    for (const ruta of rutas) {
      it(`GET ${ruta}`, async () => {
        assert.equal(await estado(ruta), 401);
      });
    }
  });

  describe('con usuario autenticado (alice) → 200', () => {
    for (const ruta of rutas) {
      it(`GET ${ruta}`, async () => {
        assert.equal(await estado(ruta, alice), 200);
      });
    }
  });
});
