// R14 / D47 — Totales de la cabecera del detalle de una conexión (Asientos ocupados y Capacidad), con el
// mock: los valores se comparan contra test/data. Camino de producción (qué recibe el RAP) en
// r14-totales-produccion.test.ts.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iniciar, alice, raiz } from './helpers.ts';

const { GET, POST } = iniciar();
const URL = '/odata/v4/reporte/';

type Fila = Record<string, string>;
const csv = (entidad: string): Fila[] => {
  const [cabecera, ...filas] = readFileSync(`${raiz}/test/data/ZMAKS_SB_CONEXIONES-${entidad}.csv`, 'utf8')
    .split(/\r?\n/).filter(Boolean).map(l => l.split(';'));
  return filas.map(f => Object.fromEntries(cabecera.map((c, i) => [c, f[i]])));
};
const vuelos = csv('Vuelos');
const conexiones = csv('Conexiones');
const totales = (aerolinea: string, conexion: string) => {
  const suyos = vuelos.filter(v => v.CarrierId === aerolinea && v.ConnectionId === conexion);
  return {
    TotalAsientosOcupados: suyos.reduce((s, v) => s + Number(v.SeatsOccupied), 0),
    TotalCapacidad: suyos.reduce((s, v) => s + Number(v.SeatsMax), 0),
  };
};
const SELECT_CABECERA = '$select=CarrierName,TotalAsientosOcupados,TotalCapacidad';

describe('R14 — totales en la cabecera del detalle (mock)', () => {
  it('detalle de AA 0017: suma de sus vuelos en test/data', async () => {
    const { data } = await GET(`${URL}Conexiones(CarrierId='AA',ConnectionId='0017')?${SELECT_CABECERA}`, alice);
    const esperado = totales('AA', '0017');
    assert.ok(esperado.TotalCapacidad > 0, 'test/data debe tener vuelos de AA 0017');
    assert.equal(data.TotalAsientosOcupados, esperado.TotalAsientosOcupados);
    assert.equal(data.TotalCapacidad, esperado.TotalCapacidad);
  });

  it('conexión sin vuelos (LH 0402): 0 y 0, sin error (decisión del usuario, coherente con R7)', async () => {
    const { status, data } = await GET(`${URL}Conexiones(CarrierId='LH',ConnectionId='0402')?${SELECT_CABECERA}`, alice);
    assert.equal(status, 200);
    assert.equal(data.TotalAsientosOcupados, 0);
    assert.equal(data.TotalCapacidad, 0);
  });

  it('sin $select (todos los campos) también trae los totales', async () => {
    const { data } = await GET(`${URL}Conexiones(CarrierId='AA',ConnectionId='0017')`, alice);
    assert.deepEqual({ TotalAsientosOcupados: data.TotalAsientosOcupados, TotalCapacidad: data.TotalCapacidad }, totales('AA', '0017'));
  });

  it('en una lista, cada conexión con sus propios totales', async () => {
    const { data } = await GET(`${URL}Conexiones?$select=CarrierId,ConnectionId,TotalAsientosOcupados,TotalCapacidad`, alice);
    assert.equal(data.value.length, conexiones.length);
    for (const c of data.value)
      assert.deepEqual({ TotalAsientosOcupados: c.TotalAsientosOcupados, TotalCapacidad: c.TotalCapacidad },
        totales(c.CarrierId, c.ConnectionId), `${c.CarrierId} ${c.ConnectionId}`);
  });

  it('la lista sin los totales en $select no los trae (como pide el List Report)', async () => {
    const { data } = await GET(`${URL}Conexiones?$select=CarrierId,ConnectionId`, alice);
    for (const c of data.value) assert.deepEqual(Object.keys(c).sort(), ['CarrierId', 'ConnectionId']);
  });

  it('junto con $expand=_Flight (como el detalle) el total coincide con los vuelos expandidos', async () => {
    const { data } = await GET(`${URL}Conexiones(CarrierId='AA',ConnectionId='0017')?${SELECT_CABECERA}&$expand=_Flight($select=SeatsMax)`, alice);
    assert.equal(data.TotalCapacidad, data._Flight.reduce((s: number, v: { SeatsMax: number }) => s + v.SeatsMax, 0));
  });

  it('dentro de $batch (como pide Fiori) da los mismos totales', async () => {
    const ruta = `Conexiones(CarrierId='AA',ConnectionId='0017')?${SELECT_CABECERA}`;
    const cuerpo = `--b\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nGET ${ruta} HTTP/1.1\r\nAccept: application/json\r\n\r\n\r\n--b--\r\n`;
    const { data } = await POST(`${URL}$batch`, cuerpo, { ...alice, headers: { 'content-type': 'multipart/mixed; boundary=b' } });
    const esperado = totales('AA', '0017');
    assert.match(String(data), new RegExp(`"TotalAsientosOcupados":${esperado.TotalAsientosOcupados}`));
    assert.match(String(data), new RegExp(`"TotalCapacidad":${esperado.TotalCapacidad}`));
  });
});
