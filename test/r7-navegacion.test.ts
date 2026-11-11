// R7 — Desde una conexión se puede navegar a sus vuelos con /_Flight (mismo CarrierId y ConnectionId).
// $expand=_Flight está fuera de R7 (D64): sus tests quedan como regresión.
// Con el mock de D25 (test/mock/rap.ts), que usa la condición de `_Flight` confirmada en ADT.
// El camino de producción (delegar `_Flight` al RAP) se prueba en r7-produccion.test.ts (D26).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iniciar, alice, raiz } from './helpers.ts';
import { CONDICION_FLIGHT } from './mock/rap.ts';

const { GET } = iniciar();
const URL = '/odata/v4/reporte/';

type Fila = Record<string, string>;
const csv = (entidad: string): Fila[] => {
  const [cabecera, ...filas] = readFileSync(`${raiz}/test/data/ZMAKS_SB_CONEXIONES-${entidad}.csv`, 'utf8')
    .split(/\r?\n/).filter(Boolean).map(l => l.split(';'));
  return filas.map(f => Object.fromEntries(cabecera.map((c, i) => [c, f[i]])));
};
const vuelosCsv = csv('Vuelos');
const conexionesCsv = csv('Conexiones');
const clave = (f: Record<string, unknown>) => `${f.CarrierId}/${f.ConnectionId}`;
const fechasCsv = (c: Record<string, unknown>) =>
  vuelosCsv.filter(v => clave(v) === clave(c)).map(v => v.FlightDate).sort();
const fechas = (vuelos: { FlightDate: string }[]) => vuelos.map(v => v.FlightDate).sort();

describe('R7 — navegación de una conexión a sus vuelos', () => {
  it('la condición del mock es la del RAP (ADT): CarrierId = CarrierId y ConnectionId = ConnectionId', () => {
    assert.deepEqual(CONDICION_FLIGHT, [['CarrierId', 'CarrierId'], ['ConnectionId', 'ConnectionId']]);
  });

  describe('Conexiones(...)/_Flight', () => {
    it('AA 0017 → exactamente sus 2 vuelos (2026-12-01 y 2026-12-15)', async () => {
      const { data } = await GET(`${URL}Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?$count=true`, alice);
      assert.equal(data['@odata.count'], 2);
      assert.deepEqual(fechas(data.value), ['2026-12-01', '2026-12-15']);
      for (const v of data.value) {
        assert.equal(v.CarrierId, 'AA');
        assert.equal(v.ConnectionId, '0017');
      }
    });

    it('LH 0400 → 1 vuelo, sin los de otra conexión de la misma aerolínea', async () => {
      const { data } = await GET(`${URL}Conexiones(CarrierId='LH',ConnectionId='0400')/_Flight`, alice);
      assert.deepEqual(data.value.map(clave), ['LH/0400']);
      assert.deepEqual(fechas(data.value), ['2026-12-03']);
    });

    it('conexión sin vuelos (LH 0402) → tabla vacía, sin error (aunque el RAP declare [1..*])', async () => {
      const { status, data } = await GET(`${URL}Conexiones(CarrierId='LH',ConnectionId='0402')/_Flight?$count=true`, alice);
      assert.equal(status, 200);
      assert.equal(data['@odata.count'], 0);
      assert.deepEqual(data.value, []);
    });

    it('un vuelo concreto por su clave completa', async () => {
      const { data } = await GET(
        `${URL}Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight(CarrierId='AA',ConnectionId='0017',FlightDate=2026-12-15)`, alice);
      assert.equal(data.FlightDate, '2026-12-15');
      assert.equal(data.SeatsOccupied, 201);
    });
  });

  // D64: $expand=_Flight está fuera de R7 (la app usa /_Flight); se mantiene como regresión del mock.
  describe('$expand=_Flight (fuera de R7, regresión, D64)', () => {
    it('en la lista, cada conexión trae solo sus vuelos (comparado contra test/data)', async () => {
      const { data } = await GET(`${URL}Conexiones?$expand=_Flight`, alice);
      assert.equal(data.value.length, conexionesCsv.length);
      for (const c of data.value) {
        assert.deepEqual(fechas(c._Flight), fechasCsv(c), `vuelos de ${clave(c)}`);
        for (const v of c._Flight) assert.equal(clave(v), clave(c), `vuelo ajeno en ${clave(c)}`);
      }
    });

    it('en el detalle de una conexión, con $select y $orderby dentro del $expand', async () => {
      const { data } = await GET(
        `${URL}Conexiones(CarrierId='AA',ConnectionId='0017')?$expand=_Flight($select=FlightDate;$orderby=FlightDate desc)`, alice);
      assert.deepEqual(data._Flight.map((v: { FlightDate: string }) => v.FlightDate), ['2026-12-15', '2026-12-01']);
    });

    it('conexión sin vuelos (LH 0402) → _Flight vacío, sin error', async () => {
      const { status, data } = await GET(`${URL}Conexiones(CarrierId='LH',ConnectionId='0402')?$expand=_Flight`, alice);
      assert.equal(status, 200);
      assert.deepEqual(data._Flight, []);
    });
  });
});
