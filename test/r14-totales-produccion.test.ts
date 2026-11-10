// R14 / D47 — Camino de producción de los totales de la cabecera: CAP no le pide al RAP los campos
// virtual (no existen allí) y calcula los totales con UNA petición `filter/groupby/aggregate` (la que el
// RAP real acepta, prueba A en SPEC.md), sin `concat`, `top` ni `$count` (pruebas B y C); solo si se leen
// muchas conexiones a la vez, en varias peticiones GET que no pasan del largo que CAP enviaría en `$batch`. Con el RAP
// simulado de test/rap-simulado.ts (proceso aparte, NODE_ENV=production).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, type Entorno } from './rap-simulado.ts';
import { rechazoDelGateway } from './mock/rap.ts';

const conexion = (CarrierId: string, ConnectionId: string) => ({ CarrierId, ConnectionId, CarrierName: `Aerolínea ${CarrierId}` });
const AA = conexion('AA', '0017');
const LH = conexion('LH', '0402');                              // sin vuelos: el RAP no la devuelve en el groupby
const MUCHAS = Array.from({ length: 120 }, (_, i) => conexion('ZZ', String(i).padStart(4, '0')));
const SUMA_AA = { CarrierId: 'AA', ConnectionId: '0017', SeatsOccupied: 573, SeatsMax: 770 };

const APPLY_AA = "filter((CarrierId eq 'AA' and ConnectionId eq '0017'))/groupby((CarrierId,ConnectionId),aggregate(SeatsOccupied,SeatsMax))";
const SELECT_CABECERA = '$select=CarrierName,TotalAsientosOcupados,TotalCapacidad';

let rap: Entorno;
const totales = () => rap.recibidas.filter(u => u.includes('$apply'));

describe('R14 / D47 — producción: totales de la cabecera calculados por el RAP', () => {
  before(async () => {
    rap = await iniciar(url => {
      const rechazo = rechazoDelGateway(url, Object.keys(SUMA_AA));
      if (rechazo) return { __status: rechazo.status, error: { code: String(rechazo.status), message: rechazo.message } };
      // Como el Gateway real: no soporta `top` ni `$count` dentro de `$apply` (pruebas B y C).
      if (/\$apply=.*(\btop\(|\$count)/.test(url)) return { __status: 400, error: { code: '400', message: "Unsupported transformation 'top'" } };
      // Campos que no existen en el RAP: el Gateway respondería 400.
      if (/Total(AsientosOcupados|Capacidad)/.test(url)) return { __status: 400, error: { code: '400', message: 'Property not found' } };
      if (url.includes('$apply')) return { value: url.includes("CarrierId eq 'AA'") ? [SUMA_AA] : [] };
      if (url.startsWith("/Conexiones(CarrierId='AA'")) return AA;
      if (url.startsWith("/Conexiones(CarrierId='LH'")) return LH;
      if (url.startsWith('/Conexiones?')) return { value: MUCHAS };
      return { value: [] };
    });
  });
  after(() => rap?.cerrar());

  it('detalle: los totales vienen del RAP, con una sola petición groupby/aggregate', async () => {
    const r = await rap.pedir(`Conexiones(CarrierId='AA',ConnectionId='0017')?${SELECT_CABECERA}`);
    assert.equal(r.status, 200);
    const data = await r.json();
    assert.equal(data.TotalAsientosOcupados, SUMA_AA.SeatsOccupied);
    assert.equal(data.TotalCapacidad, SUMA_AA.SeatsMax);
    assert.deepEqual(totales(), [`/Vuelos?$apply=${APPLY_AA}`]);
    assert.equal(rap.recibidas.length, 2, `peticiones al RAP: ${rap.recibidas.join(' | ')}`);
  });

  it('al RAP nunca se le piden los campos virtual (el Gateway respondería 400)', async () => {
    await rap.pedir(`Conexiones(CarrierId='AA',ConnectionId='0017')?${SELECT_CABECERA}`);
    for (const u of rap.recibidas) assert.doesNotMatch(u, /Total(AsientosOcupados|Capacidad)/);
  });

  it('dentro de $batch (como pide Fiori) también: una sola petición de totales', async () => {
    const respuesta = await rap.pedirEnBatch(`Conexiones(CarrierId='AA',ConnectionId='0017')?${SELECT_CABECERA}`);
    assert.match(respuesta, new RegExp(`"TotalAsientosOcupados":${SUMA_AA.SeatsOccupied}`));
    assert.match(respuesta, new RegExp(`"TotalCapacidad":${SUMA_AA.SeatsMax}`));
    assert.deepEqual(totales(), [`/Vuelos?$apply=${APPLY_AA}`]);
  });

  it('conexión sin vuelos (el groupby del RAP no la trae): 0 y 0', async () => {
    const data = await (await rap.pedir(`Conexiones(CarrierId='LH',ConnectionId='0402')?${SELECT_CABECERA}`)).json();
    assert.equal(data.TotalAsientosOcupados, 0);
    assert.equal(data.TotalCapacidad, 0);
  });

  it('la lista sin los totales en $select no hace la petición de totales', async () => {
    const r = await rap.pedir('Conexiones?$select=CarrierId,ConnectionId,CarrierName');
    assert.equal(r.status, 200);
    assert.deepEqual(totales(), []);
    assert.equal(rap.recibidas.length, 1);
  });

  it('una lista con totales de 120 conexiones: pocas peticiones GET (no una por fila) y ninguna en $batch', async () => {
    const r = await rap.pedir('Conexiones?$select=CarrierId,ConnectionId,TotalCapacidad');
    assert.equal(r.status, 200);
    assert.equal((await r.json()).value.length, MUCHAS.length);
    const n = totales().length;
    assert.ok(n > 1 && n <= MUCHAS.length / 5, `peticiones de totales: ${n}`);
    // CAP envolvería en $batch un GET más largo que cds.env.remote.max_get_url_length (1028).
    assert.ok(!rap.recibidas.some(u => u.includes('$batch')), 'una petición de totales se envolvió en $batch');
    for (const u of totales()) assert.ok(encodeURI(u).length <= 1028, `URL de ${encodeURI(u).length} caracteres`);
  });
});
