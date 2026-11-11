// R5 — En desarrollo y test los datos vienen de test/data/; en producción, de la
// destination S4_BACKEND. Los CSV no se incluyen en el build.
// D65: el nombre real de la destination se pasa al desplegar con un .mtaext no versionado.
import cds from '@sap/cds';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parse } from 'yaml';
import path from 'node:path';
import { iniciar, alice, cdsCli, raiz } from './helpers.ts';

const { GET } = iniciar();

describe('R5 — origen de los datos', () => {
  describe('desarrollo / test: datos mock de test/data/', () => {
    it('Conexiones devuelve las 5 filas del CSV', async () => {
      const { data } = await GET('/odata/v4/reporte/Conexiones?$count=true&$top=0', alice);
      assert.equal(data['@odata.count'], 5);
    });

    it('Vuelos devuelve las 5 filas del CSV', async () => {
      const { data } = await GET('/odata/v4/reporte/Vuelos?$count=true&$top=0', alice);
      assert.equal(data['@odata.count'], 5);
    });

    it('Aeropuertos devuelve las 5 filas del CSV (D50)', async () => {
      const { data } = await GET('/odata/v4/reporte/Aeropuertos?$count=true&$top=0', alice);
      assert.equal(data['@odata.count'], 5);
    });

    it('el servicio remoto no tiene credenciales (usa el mock)', () => {
      assert.equal(cds.env.requires.ZMAKS_SB_CONEXIONES.credentials, undefined);
      assert.equal(cds.env.requires.I_AIRPORT_STDVH.credentials, undefined);
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

    it('el F4 de aeropuertos usa la misma destination y la ruta con ;ps=…;va=… (D51, probada en GW_CLIENT)', async () => {
      const { stdout } = await cdsCli(
        ['env', 'get', 'requires.I_AIRPORT_STDVH.credentials', '--profile', 'production', '--json']);
      assert.deepEqual(JSON.parse(stdout), {
        destination: 'S4_BACKEND',
        path: "/sap/opu/odata4/sap/zmaks_sb_conexiones/srvd_f4/dmo/i_airport_stdvh/0001;ps='srvd-zmaks_sd_conexiones-0001';va='com.sap.gateway.srvd.zmaks_sd_conexiones.v0001.et-zmaks_i_conexiones.airportfromid'",
      });
    });
  });

  describe('D65 — destination real vía .mtaext no versionado', () => {
    const plantilla = 'deploy/destination.mtaext.ejemplo';
    const ext = parse(readFileSync(path.join(raiz, plantilla), 'utf8'));

    it('la plantilla extiende el MTA y fija CDS_CONFIG en el módulo del servicio', () => {
      const mta = parse(readFileSync(path.join(raiz, 'mta.yaml'), 'utf8'));
      assert.equal(ext.extends, mta.ID);
      const srv = ext.modules.find((m: any) => m.name === 'reporte-simple-srv');
      assert.ok(mta.modules.some((m: any) => m.name === srv?.name), 'el módulo existe en mta.yaml');
      assert.match(srv.properties.CDS_CONFIG, /<DESTINATION>/);
    });

    for (const servicio of ['ZMAKS_SB_CONEXIONES', 'I_AIRPORT_STDVH']) {
      it(`${servicio}: CDS_CONFIG de la plantilla cambia solo la destination y conserva el path`, async () => {
        const cdsConfig = ext.modules[0].properties.CDS_CONFIG.replaceAll('<DESTINATION>', 'DESTINATION_REAL');
        const env = (extra = {}) => cdsCli(['env', 'get', `requires.${servicio}.credentials`, '--profile', 'production', '--json'], extra)
          .then(r => JSON.parse(r.stdout));
        const [base, real] = await Promise.all([env(), env({ CDS_CONFIG: cdsConfig })]);
        assert.equal(base.destination, 'S4_BACKEND');
        assert.deepEqual(real, { ...base, destination: 'DESTINATION_REAL' });
      });
    }

    it('*.mtaext y LOCAL.md están en .gitignore; la plantilla sí se versiona', () => {
      const ignorado = (f: string) => {
        try { execFileSync('git', ['check-ignore', '-q', f], { cwd: raiz }); return true; } catch { return false; }
      };
      assert.ok(ignorado('deploy/destination.mtaext'));
      assert.ok(ignorado('LOCAL.md'));
      assert.ok(!ignorado(plantilla));
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

    // D13 / D60: el TypeScript viaja compilado (sin tsx en producción). Un `cds.build.tasks`
    // explícito o `cds build -o` copian los .ts sin compilar y dejan fuera @cds-models.
    it('srv/ viaja compilado a JavaScript, sin .ts (D13, D60)', () => {
      for (const f of ['srv/srv/service.js', 'srv/srv/server.js', 'srv/@cds-models/ReporteService/index.js'])
        assert.ok(archivos.includes(f), `falta ${f} en el build`);
      assert.deepEqual(archivos.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts')), []);
    });

    it('no contiene ningún .csv', () => {
      assert.deepEqual(archivos.filter(f => f.toLowerCase().endsWith('.csv')), []);
    });

    it('no contiene test/data', () => {
      assert.deepEqual(archivos.filter(f => /(^|\/)test\/data(\/|$)/.test(f)), []);
    });

    it('no contiene el mock del RAP (test/mocked.js ni test/mock/, D25)', () => {
      assert.deepEqual(archivos.filter(f => /(^|\/)test\/(mocked\.js$|mock(\/|$))/.test(f)), []);
    });
  });
});
