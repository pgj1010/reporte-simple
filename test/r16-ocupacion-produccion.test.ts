// R16 / D72 — Camino de producción de ocupacionPorConexion: qué le pide CAP al RAP. Las sumas y la cantidad de
// vuelos llegan como URL `$apply` que el Gateway real acepta (sin alias, sin `$count`, sin `concat` ni `top`),
// las conexiones por la delegación normal (R4) y nunca se piden filas completas de Vuelos.
// Corre con el RAP simulado de test/rap-simulado.ts (proceso aparte, NODE_ENV=production).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, type Entorno } from './rap-simulado.ts';
import { rechazoDelGateway } from './mock/rap.ts';

let rap: Entorno;

/** Respuestas del RAP simulado: dos conexiones de LH (0402 sin vuelos) y dos vuelos de 0400. */
const responder = (url: string) => {
  if (url.startsWith('/Conexiones?')) return { value: [
    { CarrierId: 'LH', ConnectionId: '0400', CarrierName: 'Lufthansa', AirportFromId: 'FRA', AirportToId: 'JFK' },
    { CarrierId: 'LH', ConnectionId: '0402', CarrierName: 'Lufthansa', AirportFromId: 'FRA', AirportToId: 'JFK' },
  ] };
  if (url.includes('aggregate(')) return { value: [{ CarrierId: 'LH', ConnectionId: '0400', SeatsOccupied: 600, SeatsMax: 660 }] };
  if (url.includes('FlightDate))')) return { value: [
    { CarrierId: 'LH', ConnectionId: '0400', FlightDate: '2026-12-03' },
    { CarrierId: 'LH', ConnectionId: '0400', FlightDate: '2026-12-10' },
  ] };
  return { value: [] };
};

/** Campos de Vuelos en el RAP (para revisar los alias como lo hace el Gateway). */
const CAMPOS_VUELOS = ['CarrierId', 'ConnectionId', 'FlightDate', 'Price', 'CurrencyCode', 'PlaneTypeId', 'SeatsMax', 'SeatsOccupied', 'CarrierName', 'CarrierId_Text'];

async function llamar(args: object) {
  const { status, mensaje } = await rap.pedirMcp('reporte-agent', 'tools/call', { name: 'ocupacionPorConexion', arguments: args });
  assert.equal(status, 200);
  assert.ok(!mensaje.result?.isError, JSON.stringify(mensaje));
  return { resultado: mensaje.result.structuredContent.result, recibidas: [...rap.recibidas] };
}

const conApply = (urls: string[]) => urls.filter(u => u.includes('$apply='));

describe('R16 / D72 — producción: ocupacionPorConexion agrega en el RAP', () => {
  before(async () => { rap = await iniciar(responder); });
  after(() => rap?.cerrar());

  it('con aerolinea: tres peticiones (conexiones, sumas y vuelos), las tres filtradas por la aerolínea', async () => {
    const { recibidas } = await llamar({ aerolinea: 'LH' });
    assert.equal(recibidas.length, 3, JSON.stringify(recibidas));
    const [conexiones] = recibidas.filter(u => u.startsWith('/Conexiones?'));
    assert.match(conexiones, /\$select=CarrierId,ConnectionId,CarrierName,AirportFromId,AirportToId(&|$)/);
    assert.match(conexiones, /\$filter=CarrierId eq 'LH'/);
    assert.match(conexiones, /\$orderby=CarrierId( asc)?,ConnectionId( asc)?(&|$)/);
    assert.match(conexiones, /\$top=200(&|$)/);
    assert.deepEqual(conApply(recibidas).sort(), [
      "/Vuelos?$apply=filter(CarrierId eq 'LH')/groupby((CarrierId,ConnectionId),aggregate(SeatsOccupied,SeatsMax))",
      "/Vuelos?$apply=filter(CarrierId eq 'LH')/groupby((CarrierId,ConnectionId,FlightDate))",
    ]);
  });

  it('sin aerolinea: los $apply no llevan filter', async () => {
    const { recibidas } = await llamar({});
    assert.deepEqual(conApply(recibidas).sort(), [
      '/Vuelos?$apply=groupby((CarrierId,ConnectionId),aggregate(SeatsOccupied,SeatsMax))',
      '/Vuelos?$apply=groupby((CarrierId,ConnectionId,FlightDate))',
    ]);
  });

  it('el Gateway real aceptaría cada $apply: sin alias, sin $count, sin concat ni top (D43, D47)', async () => {
    const { recibidas } = await llamar({ aerolinea: 'LH' });
    for (const url of conApply(recibidas)) {
      assert.equal(rechazoDelGateway(url, CAMPOS_VUELOS), undefined, url);
      assert.doesNotMatch(url, /\$count|\bconcat\(|\btop\(|\bwith\b|\bas\b/, url);
    }
  });

  it('nunca se piden filas completas de Vuelos (toda lectura de Vuelos es un $apply)', async () => {
    const { recibidas } = await llamar({});
    assert.deepEqual(recibidas.filter(u => u.startsWith('/Vuelos') && !u.includes('$apply=')), []);
  });

  it('une las respuestas del RAP: sumas, vuelos contados, ruta y % (null sin vuelos)', async () => {
    const { resultado } = await llamar({ aerolinea: 'LH' });
    assert.deepEqual(resultado, [
      { CarrierId: 'LH', CarrierName: 'Lufthansa', ConnectionId: '0400', Ruta: 'FRA → JFK',
        CantidadVuelos: 2, AsientosOcupados: 600, Capacidad: 660, PorcentajeOcupacion: 90.9 },
      { CarrierId: 'LH', CarrierName: 'Lufthansa', ConnectionId: '0402', Ruta: 'FRA → JFK',
        CantidadVuelos: 0, AsientosOcupados: 0, Capacidad: 0, PorcentajeOcupacion: null },
    ]);
  });
});
