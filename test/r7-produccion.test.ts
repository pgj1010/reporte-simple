// R7 / D26 — Camino de producción de `_Flight`: CAP delega la navegación al RAP tal cual
// (`/_Flight` y `$expand=_Flight`, con ese nombre y en una sola petición) y el RAP la resuelve
// con su propia asociación. Si alguien "arregla" R7 en `srv/` con una asociación propia
// (p. ej. `_FlightCAP as _Flight`), CAP pediría al RAP una navegación que no existe y este test falla.
//
// Corre con el RAP simulado de test/rap-simulado.ts (proceso aparte, NODE_ENV=production). También
// verifica que en producción el mock de D25 (`test/mocked.js`) no se activa, aunque se pase `--with-mocks`.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cdsCli } from './helpers.ts';
import { iniciar, type Entorno } from './rap-simulado.ts';

let rap: Entorno;

/** GET y devuelve lo que recibió el RAP durante esa petición. */
async function alRap(ruta: string): Promise<string[]> {
  await rap.pedir(ruta);
  return [...rap.recibidas];
}

describe('R7 / D26 — producción: _Flight se delega al RAP', () => {
  before(async () => { rap = await iniciar(); });
  after(() => rap?.cerrar());

  it('Conexiones(...)/_Flight llega al RAP como /_Flight, en una sola petición', async () => {
    const r = await alRap("Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight");
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\(CarrierId='AA',ConnectionId='0017'\)\/_Flight(\?|$)/);
  });

  it('$expand=_Flight llega al RAP como $expand=_Flight, en una sola petición', async () => {
    const r = await alRap('Conexiones?$expand=_Flight($select=FlightDate)');
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\?.*\$expand=_Flight\(/);
  });

  it('el detalle de una conexión pide sus vuelos con $expand=_Flight en una sola petición', async () => {
    const r = await alRap("Conexiones(CarrierId='AA',ConnectionId='0017')?$expand=_Flight");
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\(CarrierId='AA',ConnectionId='0017'\)\?.*\$expand=_Flight(?!\w)/);
  });

  describe('el mock de D25 no se activa en producción', () => {
    it('features.test_mocks es false con NODE_ENV=production', async () => {
      const { stdout } = await cdsCli(['env', 'get', 'features.test_mocks'], { NODE_ENV: 'production' });
      assert.equal(stdout.trim(), 'false');
    });

    it('CAP no carga test/mocked.js ni el mock de _Flight (aun con --with-mocks)', () => {
      assert.doesNotMatch(rap.salida(), /adding mock behaviours|mock de _Flight activo/);
    });

    it('el servicio remoto no se simula: se conecta al RAP', () => {
      assert.doesNotMatch(rap.salida(), /mocking ZMAKS_SB_CONEXIONES/);
    });
  });
});
