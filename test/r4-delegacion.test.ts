// R4 — Las lecturas se delegan al servicio remoto ZMAKS_SB_CONEXIONES (y Aeropuertos al F4 I_AIRPORT_STDVH, D50);
// CAP no guarda copia de los datos.
import cds from '@sap/cds';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, alice, cdsCli } from './helpers.ts';

const { GET } = iniciar();

describe('R4 — delegación al servicio remoto', () => {
  let lecturasRemotas: string[] = [];
  let espiaRegistrado = false;

  beforeEach(async () => {
    lecturasRemotas = [];
    if (espiaRegistrado) return;
    for (const nombre of ['ZMAKS_SB_CONEXIONES', 'I_AIRPORT_STDVH']) {
      const remoto = await cds.connect.to(nombre);
      remoto.prepend(() => remoto.before('READ', '*', req => { lecturasRemotas.push(req.target?.name ?? `URL ${(req as unknown as { path: string }).path}`); }));
    }
    espiaRegistrado = true;
  });

  for (const entidad of ['Conexiones', 'Vuelos']) {
    it(`GET ${entidad} llega al servicio remoto`, async () => {
      const { status, data } = await GET(`/odata/v4/reporte/${entidad}`, alice);
      assert.equal(status, 200);
      assert.ok(data.value.length > 0);
      // Conexiones sin $select trae también los totales de la cabecera (R14): una lectura más al
      // remoto, por URL ($apply sobre Vuelos). Tampoco se guarda copia: es otra lectura delegada.
      // En el mock, esa URL se ejecuta como una lectura más de Vuelos (test/mock/rap.ts, leerUrl).
      const totales = entidad === 'Conexiones'
        ? [lecturasRemotas.find(l => l.startsWith('URL ')), 'ZMAKS_SB_CONEXIONES.Vuelos'] : [];
      assert.deepEqual(lecturasRemotas, [`ZMAKS_SB_CONEXIONES.${entidad}`, ...totales]);
      if (totales.length) assert.match(totales[0]!, /Vuelos\?\$apply=/);
    });
  }

  it('GET Aeropuertos llega al F4 remoto I_AIRPORT_STDVH (D50)', async () => {
    const { status, data } = await GET('/odata/v4/reporte/Aeropuertos', alice);
    assert.equal(status, 200);
    assert.ok(data.value.length > 0);
    assert.deepEqual(lecturasRemotas, ['I_AIRPORT_STDVH.xDMOxI_Airport_StdVH']);
  });

  it('la búsqueda del diálogo F4 ($search) llega al F4 remoto (D51)', async () => {
    const { data } = await GET('/odata/v4/reporte/Aeropuertos?$search=Frankfurt', alice);
    assert.deepEqual(data.value.map((a: { AirportID: string }) => a.AirportID), ['FRA']);
    assert.deepEqual(lecturasRemotas, ['I_AIRPORT_STDVH.xDMOxI_Airport_StdVH']);
  });

  it('en producción no se crea ninguna tabla ni vista para el reporte ni para el remoto', async () => {
    // DDL del perfil production, sin los mocks de desarrollo: es lo que se despliega.
    const { stdout } = await cdsCli(['compile', '*', '--to', 'sql', '--profile', 'production']);
    const creados = stdout.match(/^CREATE (TABLE|VIEW) \S+/gm) ?? [];
    assert.ok(creados.length > 0, 'control: el DDL de producción no está vacío');
    assert.deepEqual(creados.filter(c => /(ReporteService|ZMAKS_SB_CONEXIONES|I_AIRPORT_STDVH)_/.test(c)), []);
  });

  it('en desarrollo, ReporteService solo tiene vistas sobre el mock del remoto (no copia datos)', async () => {
    const objetos = await cds.db.run(
      "SELECT type, name FROM sqlite_master WHERE name LIKE 'ReporteService%' ORDER BY name") as
      { type: string; name: string }[];
    assert.deepEqual(objetos.map(o => `${o.type} ${o.name}`), [
      'view ReporteService_Aeropuertos',
      'view ReporteService_Conexiones',
      'view ReporteService_Vuelos',
    ]);
  });
});
