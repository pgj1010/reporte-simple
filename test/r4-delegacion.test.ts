// R4 — Las lecturas se delegan al servicio remoto ZMAKS_SB_CONEXIONES;
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
    const remoto = await cds.connect.to('ZMAKS_SB_CONEXIONES');
    remoto.prepend(() => remoto.before('READ', '*', req => { lecturasRemotas.push(req.target.name); }));
    espiaRegistrado = true;
  });

  for (const entidad of ['Conexiones', 'Vuelos']) {
    it(`GET ${entidad} llega al servicio remoto`, async () => {
      const { status, data } = await GET(`/odata/v4/reporte/${entidad}`, alice);
      assert.equal(status, 200);
      assert.ok(data.value.length > 0);
      assert.deepEqual(lecturasRemotas, [`ZMAKS_SB_CONEXIONES.${entidad}`]);
    });
  }

  it('en producción no se crea ninguna tabla ni vista para el reporte ni para el remoto', async () => {
    // DDL del perfil production, sin los mocks de desarrollo: es lo que se despliega.
    const { stdout } = await cdsCli(['compile', '*', '--to', 'sql', '--profile', 'production']);
    const creados = stdout.match(/^CREATE (TABLE|VIEW) \S+/gm) ?? [];
    assert.ok(creados.length > 0, 'control: el DDL de producción no está vacío');
    assert.deepEqual(creados.filter(c => /(ReporteService|ZMAKS_SB_CONEXIONES)_/.test(c)), []);
  });

  it('en desarrollo, ReporteService solo tiene vistas sobre el mock del remoto (no copia datos)', async () => {
    const objetos = await cds.db.run(
      "SELECT type, name FROM sqlite_master WHERE name LIKE 'ReporteService%' ORDER BY name") as
      { type: string; name: string }[];
    assert.deepEqual(objetos.map(o => `${o.type} ${o.name}`), [
      'view ReporteService_Conexiones',
      'view ReporteService_Vuelos',
    ]);
  });
});
