// R3 — Todo acceso a ReporteService requiere el rol Visualizador
// (@requires: 'Visualizador', D53). Sin usuario → 401; sin el rol → 403.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const raiz = import.meta.dirname + '/..';
const { GET } = cds.test('serve', '--project', raiz, '--with-mocks', '--in-memory');
const alice = { auth: { username: 'alice', password: '' } };   // con el rol (cds.requires.auth [development])
const sinrol = { auth: { username: 'sinrol', password: '' } }; // autenticado, sin el rol

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

  describe('usuario autenticado sin el rol Visualizador (sinrol) → 403', () => {
    for (const ruta of rutas) {
      it(`GET ${ruta}`, async () => {
        assert.equal(await estado(ruta, sinrol), 403);
      });
    }
  });

  describe('con el rol Visualizador (alice) → 200', () => {
    for (const ruta of rutas) {
      it(`GET ${ruta}`, async () => {
        assert.equal(await estado(ruta, alice), 200);
      });
    }
  });
});
