// R15 / D70 — Camino de producción de ReporteAgentService: la tool `query` del agente llega al RAP (y al F4
// de aeropuertos) con la entidad real, solo los campos proyectados y el límite de filas (50 por defecto,
// 200 como máximo). Corre con el RAP simulado de test/rap-simulado.ts (proceso aparte, NODE_ENV=production).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cdsCli } from './helpers.ts';
import { iniciar, type Entorno } from './rap-simulado.ts';

let rap: Entorno;

/** Ejecuta la tool `query` del agente y devuelve las URLs que recibió el RAP. */
async function alRap(cql: string): Promise<string[]> {
  const { status, mensaje } = await rap.pedirMcp('reporte-agent', 'tools/call', { name: 'query', arguments: { cql } });
  assert.equal(status, 200);
  assert.ok(!mensaje.result?.isError, JSON.stringify(mensaje));
  return [...rap.recibidas];
}

describe('R15 / D70 — producción: ReporteAgentService delega al RAP', () => {
  before(async () => { rap = await iniciar(); });
  after(() => rap?.cerrar());

  it('Conexiones llega al RAP como /Conexiones con $select, $filter y $top=50 por defecto', async () => {
    const r = await alRap("SELECT CarrierId, AirportToId from Conexiones where CarrierId = 'LH'");
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\?/);
    assert.match(r[0], /\$select=CarrierId,AirportToId(&|$)/);
    assert.match(r[0], /\$filter=CarrierId eq 'LH'/);
    assert.match(r[0], /\$top=50(&|$)/);
  });

  it('un límite mayor que 200 se recorta a $top=200', async () => {
    const [url] = await alRap('SELECT CarrierId from Vuelos limit 1000');
    assert.match(url, /^\/Vuelos\?.*\$top=200(&|$)/);
  });

  it('SELECT * pide al RAP solo los campos de D70', async () => {
    const [url] = await alRap('SELECT * from Vuelos');
    assert.match(url, /\$select=CarrierId,ConnectionId,FlightDate,Price,CurrencyCode,PlaneTypeId,SeatsMax,SeatsOccupied(&|$)/);
  });

  it('los vuelos de una conexión llegan al RAP como /_Flight (R7), en una sola petición', async () => {
    const r = await alRap("SELECT FlightDate from Conexiones[CarrierId = 'AA' and ConnectionId = '0017']:_Flight");
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\(CarrierId='AA',ConnectionId='0017'\)\/_Flight\?/);
  });

  it('Aeropuertos llega al F4 con su ruta de producción (D50, D51)', async () => {
    const [url] = await alRap('SELECT AirportID from Aeropuertos');
    assert.match(url, /^\/f4\/sap\/opu\/odata4\/.*\/i_airport_stdvh\/0001;ps=.*\/xDMOxI_Airport_StdVH\?/);
  });

  it('en producción no se crea ninguna tabla ni vista para ReporteAgentService', async () => {
    const { stdout } = await cdsCli(['compile', '*', '--to', 'sql', '--profile', 'production']);
    assert.ok(/^CREATE (TABLE|VIEW) /m.test(stdout), 'control: el DDL de producción no está vacío');
    assert.doesNotMatch(stdout, /^CREATE (TABLE|VIEW) ReporteAgentService_/m);
  });
});
