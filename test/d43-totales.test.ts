// D43 / D38 — Totales con $apply (SUM de SeatsOccupied y SeatsMax), con el mock: los valores se
// comparan contra test/data. Las lecturas con $apply se reenvían como URL al servicio remoto; en el
// mock, test/mock/rap.ts las convierte a CQN (cds.odata.parse). Camino de producción en
// d43-totales-produccion.test.ts. Incluye la guarda de la regla 15: el reenvío NO pasaría por un
// @restrict por filas de CAP, así que este test falla si alguien agrega uno a Conexiones o Vuelos.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iniciar, alice, raiz } from './helpers.ts';

const { GET, POST } = iniciar();
const URL = '/odata/v4/reporte/';

type Fila = Record<string, string>;
const [cabecera, ...filas] = readFileSync(`${raiz}/test/data/ZMAKS_SB_CONEXIONES-Vuelos.csv`, 'utf8')
  .split(/\r?\n/).filter(Boolean).map(l => l.split(';'));
const vuelos: Fila[] = filas.map(f => Object.fromEntries(cabecera.map((c, i) => [c, f[i]])));
const suma = (lista: Fila[], campo: string) => lista.reduce((s, v) => s + Number(v[campo]), 0);
const de = (aerolinea: string, conexion: string) => vuelos.filter(v => v.CarrierId === aerolinea && v.ConnectionId === conexion);

const APPLY = 'aggregate(SeatsOccupied with sum as SeatsOccupied,SeatsMax with sum as SeatsMax)';
const apply = (t: string) => `$apply=${encodeURIComponent(t)}`;

describe('D43 / D38 — totales con $apply (mock)', () => {
  it('total general = suma de test/data', async () => {
    const { data } = await GET(`${URL}Vuelos?${apply(APPLY)}`, alice);
    assert.deepEqual(data.value, [{ SeatsOccupied: suma(vuelos, 'SeatsOccupied'), SeatsMax: suma(vuelos, 'SeatsMax') }]);
  });

  it('total de los vuelos de una conexión (navegación _Flight): AA 0017', async () => {
    const { data } = await GET(`${URL}Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?${apply(APPLY)}`, alice);
    const aa = de('AA', '0017');
    assert.deepEqual(data.value, [{ SeatsOccupied: suma(aa, 'SeatsOccupied'), SeatsMax: suma(aa, 'SeatsMax') }]);
  });

  it('conexión sin vuelos (LH 0402): sin error y sin total (SUM de cero filas)', async () => {
    const { status, data } = await GET(`${URL}Conexiones(CarrierId='LH',ConnectionId='0402')/_Flight?${apply(APPLY)}`, alice);
    assert.equal(status, 200);
    assert.equal(data.value.length, 1);
    assert.equal(data.value[0].SeatsOccupied ?? 0, 0);
  });

  it('con filter: solo los vuelos que cumplen el filtro', async () => {
    const { data } = await GET(`${URL}Vuelos?${apply("filter(CarrierId eq 'AA')/" + APPLY)}`, alice);
    const aa = vuelos.filter(v => v.CarrierId === 'AA');
    assert.deepEqual(data.value, [{ SeatsOccupied: suma(aa, 'SeatsOccupied'), SeatsMax: suma(aa, 'SeatsMax') }]);
  });

  it('con groupby: un total por moneda (patrón para reportes por moneda, p. ej. TRM)', async () => {
    const { data } = await GET(`${URL}Vuelos?${apply('groupby((CurrencyCode),aggregate(SeatsMax with sum as SeatsMax))')}`, alice);
    const monedas = [...new Set(vuelos.map(v => v.CurrencyCode))].sort();
    const esperado = monedas.map(m => ({ CurrencyCode: m, SeatsMax: suma(vuelos.filter(v => v.CurrencyCode === m), 'SeatsMax') }));
    const efectivo = [...data.value].sort((a: Fila, b: Fila) => a.CurrencyCode.localeCompare(b.CurrencyCode))
      .map((r: any) => ({ CurrencyCode: r.CurrencyCode, SeatsMax: r.SeatsMax }));
    assert.deepEqual(efectivo, esperado);
  });

  it('dentro de $batch (como pide Fiori) da el mismo total', async () => {
    const cuerpo = `--b\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nGET Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight?${apply(APPLY)} HTTP/1.1\r\nAccept: application/json\r\n\r\n\r\n--b--\r\n`;
    const { data } = await POST(`${URL}$batch`, cuerpo, { ...alice, headers: { 'Content-Type': 'multipart/mixed; boundary=b' } });
    assert.match(String(data), new RegExp(`"SeatsOccupied":${suma(de('AA', '0017'), 'SeatsOccupied')}`));
  });

  it('las lecturas sin $apply no cambian (control)', async () => {
    const { data } = await GET(`${URL}Vuelos?$count=true&$top=0`, alice);
    assert.equal(data['@odata.count'], vuelos.length);
  });

  it('regla 15: Conexiones y Vuelos no tienen @restrict por filas (el reenvío de $apply no lo aplicaría)', () => {
    const conWhere = (r: unknown) => ([] as any[]).concat(r ?? []).some(p => p && typeof p === 'object' && 'where' in p);
    const srv = cds.services.ReporteService as unknown as { definition: Record<string, unknown>; entities: Record<string, Record<string, unknown>> };
    assert.equal(conWhere(srv.definition['@restrict']), false, 'ReporteService tiene @restrict con where');
    for (const e of ['Conexiones', 'Vuelos']) {
      assert.equal(conWhere(srv.entities[e]['@restrict']), false,
        `${e} tiene @restrict con where: el reenvío de $apply (D43) lo saltaría; hay que rediseñar D43 antes`);
    }
  });
});
