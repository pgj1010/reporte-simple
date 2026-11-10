// D50 / D51 — Camino de producción del value help de aeropuertos: Aeropuertos se delega al servicio F4
// del RAP (`/srvd_f4/dmo/i_airport_stdvh/0001`) por la ruta con los parámetros de matriz `;ps=…;va=…`
// (sin ellos el Gateway real responde error: prueba a) en SPEC.md) y la búsqueda del diálogo llega como
// `$search`. Con el RAP simulado de test/rap-simulado.ts (proceso aparte, NODE_ENV=production).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, type Entorno } from './rap-simulado.ts';

const F4 = "/f4/sap/opu/odata4/sap/zmaks_sb_conexiones/srvd_f4/dmo/i_airport_stdvh/0001;ps='srvd-zmaks_sd_conexiones-0001';va='com.sap.gateway.srvd.zmaks_sd_conexiones.v0001.et-zmaks_i_conexiones.airportfromid'";
const FRA = { AirportID: 'FRA', Name: 'Frankfurt Airport', City: 'Frankfurt/Main', CountryCode: 'DE', CountryCodeText: 'Alemania' };

let rap: Entorno;

describe('D50 / D51 — producción: Aeropuertos se lee del F4 del RAP', () => {
  before(async () => {
    rap = await iniciar(url => {
      if (!url.startsWith('/f4/')) return { value: [] };
      // Como el Gateway real: sin los parámetros de matriz, error (prueba a).
      if (!url.startsWith(F4 + '/')) return { __status: 404, error: { code: '404', message: 'Service not found' } };
      if (url.includes("AirportID='FRA'")) return FRA;
      return { value: [FRA] };
    });
  });
  after(() => rap?.cerrar());

  it('la lista del diálogo llega al F4 por la ruta con ;ps=…;va=…, en una sola petición', async () => {
    const r = await rap.pedir('Aeropuertos?$select=AirportID,Name,City,CountryCode&$top=58');
    assert.equal(r.status, 200, await r.clone().text());
    assert.deepEqual((await r.json()).value.map((a: { AirportID: string }) => a.AirportID), ['FRA']);
    assert.equal(rap.recibidas.length, 1, `peticiones: ${rap.recibidas.join(' | ')}`);
    assert.ok(rap.recibidas[0].startsWith(`${F4}/xDMOxI_Airport_StdVH?`), rap.recibidas[0]);
  });

  it('la búsqueda del diálogo llega al F4 como $search (D51)', async () => {
    const r = await rap.pedir('Aeropuertos?$search=FRA&$top=58');
    assert.equal(r.status, 200);
    assert.equal(rap.recibidas.length, 1);
    assert.match(rap.recibidas[0], /[?&]\$search=FRA(&|$)/);
  });

  it('dentro de $batch (como pide Fiori) también', async () => {
    const respuesta = await rap.pedirEnBatch('Aeropuertos?$select=AirportID,Name&$top=58');
    assert.match(respuesta, /"AirportID":"FRA"/);
    assert.ok(rap.recibidas.every(u => u.startsWith(`${F4}/`)), rap.recibidas.join(' | '));
  });

  it('una conexión sigue leyéndose del servicio principal, no del F4', async () => {
    await rap.pedir("Conexiones(CarrierId='AA',ConnectionId='0017')?$select=CarrierId,ConnectionId");
    assert.deepEqual(rap.recibidas.filter(u => u.startsWith('/f4/')), []);
  });
});
