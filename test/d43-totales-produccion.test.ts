// D43 — Camino de producción de los totales: las lecturas con `$apply` llegan al RAP TAL CUAL, en una
// sola petición (el RAP agrega en su base de datos), también dentro de `$batch` (como pide Fiori) y por
// la navegación `_Flight`. Las lecturas sin `$apply` siguen por la delegación CQN de siempre (R4).
// Con el RAP simulado de test/rap-simulado.ts (proceso aparte, NODE_ENV=production).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, respuestaVacia, type Entorno } from './rap-simulado.ts';

// El RAP simulado tiene N vuelos: si CAP los pidiera para sumarlos, se notaría en las peticiones y bytes.
const N = 50_000;
const vuelo = { CarrierId: 'AA', CarrierId_Text: 'American Airlines', ConnectionId: '0017', FlightDate: '2026-12-01', Price: '422.94', CurrencyCode: 'USD', PlaneTypeId: '747-400', SeatsMax: 456, SeatsOccupied: 123, CarrierName: 'American Airlines' };
const totalRap = { SeatsOccupied: 123 * N, SeatsMax: 456 * N };

let rap: Entorno;

describe('D43 — producción: $apply se reenvía al RAP', () => {
  before(async () => {
    rap = await iniciar(url => {
      const u = new URL('http://x' + url);
      if (u.searchParams.has('$apply')) return { value: [totalRap] };
      if (/\/Vuelos\?/.test(url)) {
        const top = Number(u.searchParams.get('$top') ?? N), skip = Number(u.searchParams.get('$skip') ?? 0);
        return { value: Array.from({ length: Math.max(0, Math.min(N, skip + top) - skip) }, () => vuelo) };
      }
      return respuestaVacia(url);
    });
  });
  after(() => rap?.cerrar());

  const APPLY = 'aggregate(SeatsOccupied with sum as SeatsOccupied,SeatsMax with sum as SeatsMax)';

  it('Vuelos?$apply=… llega al RAP tal cual, en una sola petición, y CAP devuelve el total del RAP', async () => {
    const r = await rap.pedir(`Vuelos?$apply=${encodeURIComponent(APPLY)}`);
    assert.equal(r.status, 200);
    assert.deepEqual((await r.json()).value, [totalRap]);
    assert.deepEqual(rap.recibidas, [`/Vuelos?$apply=${APPLY}`]);
  });

  it('el volumen no depende de las filas: < 1 KB desde el RAP con 50.000 vuelos', async () => {
    await rap.pedir(`Vuelos?$apply=${encodeURIComponent(APPLY)}`);
    assert.ok(rap.bytes() < 1024, `bytes desde el RAP: ${rap.bytes()}`);
  });

  it('por la navegación: Conexiones(...)/_Flight?$apply=… llega al RAP con esa ruta', async () => {
    await rap.pedir(`Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?$apply=${encodeURIComponent(APPLY)}`);
    assert.deepEqual(rap.recibidas, [`/Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?$apply=${APPLY}`]);
  });

  it('dentro de $batch (como pide Fiori) también se reenvía tal cual', async () => {
    const respuesta = await rap.pedirEnBatch(`Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?$apply=${encodeURIComponent(APPLY)}`);
    assert.deepEqual(rap.recibidas, [`/Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?$apply=${APPLY}`]);
    assert.match(respuesta, new RegExp(`"SeatsOccupied":${totalRap.SeatsOccupied}`));
  });

  it('con filter y groupby (totales por moneda, como en TRM) el RAP recibe la transformación completa', async () => {
    const apply = "filter(CarrierId eq 'AA')/groupby((CurrencyCode),aggregate(SeatsMax with sum as SeatsMax))";
    await rap.pedir(`Vuelos?$apply=${encodeURIComponent(apply)}`);
    assert.deepEqual(rap.recibidas, [`/Vuelos?$apply=${apply}`]);
  });

  it('una lectura SIN $apply sigue por la delegación CQN (no se reenvía la URL del cliente)', async () => {
    await rap.pedir('Vuelos?$select=FlightDate&$top=2');
    assert.equal(rap.recibidas.length, 1);
    assert.doesNotMatch(rap.recibidas[0], /\$apply/);
    assert.match(rap.recibidas[0], /^\/Vuelos\?/);
  });
});
