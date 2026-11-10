// R5 — En desarrollo y test los datos vienen de test/data/; en producción, de la
// destination S4_BACKEND. Los CSV no se incluyen en el build.
import cds from '@sap/cds';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { iniciar, alice, cdsCli, raiz } from './helpers.ts';

const { GET } = iniciar();

describe('R5 — origen de los datos', () => {
  describe('desarrollo / test: datos mock de test/data/', () => {
    it('Conexiones devuelve las 4 filas del CSV', async () => {
      const { data } = await GET('/odata/v4/reporte/Conexiones?$count=true&$top=0', alice);
      assert.equal(data['@odata.count'], 4);
    });

    it('Vuelos devuelve las 5 filas del CSV', async () => {
      const { data } = await GET('/odata/v4/reporte/Vuelos?$count=true&$top=0', alice);
      assert.equal(data['@odata.count'], 5);
    });

    it('el servicio remoto no tiene credenciales (usa el mock)', () => {
      assert.equal(cds.env.requires.ZMAKS_SB_CONEXIONES.credentials, undefined);
    });
  });

  describe('producción: destination S4_BACKEND', () => {
    it('el perfil production apunta a la destination y la ruta del RAP', async () => {
      const { stdout } = await cdsCli(
        ['env', 'get', 'requires.ZMAKS_SB_CONEXIONES.credentials', '--profile', 'production', '--json']);
      assert.deepEqual(JSON.parse(stdout), {
        destination: 'S4_BACKEND',
        path: '/sap/opu/odata4/sap/zmaks_sb_conexiones/srvd/sap/zmaks_sd_conexiones/0001',
      });
    });
  });

  describe('cds build --production', () => {
    let destino: string;
    let archivos: string[];

    before(async () => {
      // Mismo camino que el despliegue: destino normal (gen/) redirigido con CDS_BUILD_TARGET.
      // No usar `-o`: genera otra estructura (no compila el TS) y, con varias tareas
      // escribiendo el mismo package.json, falla de forma intermitente. La ruta debe ser
      // relativa: con una absoluta, tsc escribe dentro del proyecto. `_out/` está en .gitignore.
      const relativo = `_out/r5-build-${process.pid}`;
      destino = path.join(raiz, relativo);
      rmSync(destino, { recursive: true, force: true });
      await cdsCli(['build', '--production'], { CDS_BUILD_TARGET: relativo });
      archivos = (readdirSync(destino, { recursive: true }) as string[])
        .map(f => f.split(path.sep).join('/'))
        .filter(f => !f.includes('node_modules/'));
    });

    after(() => { if (destino) rmSync(destino, { recursive: true, force: true }); });

    it('genera el servicio (control de que el build corrió)', () => {
      assert.ok(archivos.includes('srv/srv/csn.json'), 'falta srv/srv/csn.json en el build');
    });

    it('no contiene ningún .csv', () => {
      assert.deepEqual(archivos.filter(f => f.toLowerCase().endsWith('.csv')), []);
    });

    it('no contiene test/data', () => {
      assert.deepEqual(archivos.filter(f => /(^|\/)test\/data(\/|$)/.test(f)), []);
    });
  });
});
