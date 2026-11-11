// D54 / D55 — La configuración de despliegue es coherente entre sí: mta.yaml, xs-security.json y,
// por cada app, xs-app.json, manifest.json y ui5-deploy.yaml. Un nombre distinto en dos de estos
// archivos no lo detecta `mbt build`: aparece recién desplegado (404 de la app o del servicio).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { raiz } from './helpers.ts';

const leer = (f: string) => readFileSync(path.join(raiz, f), 'utf8');
const mta = parse(leer('mta.yaml'));
const apps = readdirSync(path.join(raiz, 'app'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(path.join(raiz, 'app', d.name, 'webapp', 'manifest.json')))
  .map(d => d.name);

const recurso = (servicio: string) => mta.resources.find((r: any) => r.parameters?.service === servicio);
/** Destinos que crea la instancia destination (init_data): a ellos apuntan las rutas de xs-app.json. */
const destinosServicio: string[] = recurso('destination').parameters.config.init_data.instance.destinations.map((d: any) => d.Name);
/** Destinos del contenido para el app router administrado (llevan sap.cloud.service). */
const destinosContenido: any[] = mta.modules
  .filter((m: any) => m.type === 'com.sap.application.content')
  .flatMap((m: any) => m.parameters?.content?.instance?.destinations ?? []);

describe('D54 / D55 — configuración de despliegue', () => {
  it('xsuaa usa ./xs-security.json', () => {
    assert.equal(recurso('xsuaa').parameters.path, './xs-security.json');
  });

  it('las instancias son propias del proyecto (prefijo reporte-simple-, D55)', () => {
    const managed = mta.resources.filter((r: any) => r.type === 'org.cloudfoundry.managed-service').map((r: any) => r.name);
    assert.deepEqual(managed.filter((n: string) => !n.startsWith('reporte-simple-')), []);
  });

  it('el servicio CAP corre con NODE_ENV=production y usa xsuaa, destination y connectivity', () => {
    const srv = mta.modules.find((m: any) => m.path === 'gen/srv');
    assert.equal(srv?.properties?.NODE_ENV, 'production');
    const requeridos = srv.requires.map((r: any) => r.name);
    for (const s of ['xsuaa', 'destination', 'connectivity']) assert.ok(requeridos.includes(recurso(s).name), s);
  });

  for (const app of apps) {
    describe(`app/${app}`, () => {
      const manifest = JSON.parse(leer(`app/${app}/webapp/manifest.json`));
      const xsApp = JSON.parse(leer(`app/${app}/xs-app.json`));
      const deploy = parse(leer(`app/${app}/ui5-deploy.yaml`));
      const zip = deploy.builder.customTasks.find((t: any) => t.name === 'ui5-task-zipper').configuration;

      it('cada ruta con destination de xs-app.json existe en la instancia destination', () => {
        const usados = xsApp.routes.filter((r: any) => r.destination).map((r: any) => r.destination);
        assert.ok(usados.length > 0);
        assert.deepEqual(usados.filter((d: string) => !destinosServicio.includes(d)), []);
      });

      it('la ruta relativa del servicio (regla 17) la toma una ruta de xs-app.json hacia el servicio CAP', () => {
        const uri = '/' + manifest['sap.app'].dataSources.mainService.uri;
        const ruta = xsApp.routes.find((r: any) => new RegExp(r.source).test(uri));
        assert.ok(ruta?.destination, `ninguna ruta con destination toma ${uri}`);
      });

      it('sap.cloud.service coincide con los destinos del app router administrado', () => {
        const servicio = manifest['sap.cloud']?.service;
        assert.ok(servicio, 'falta sap.cloud.service en manifest.json');
        assert.ok(destinosContenido.length >= 2);
        for (const d of destinosContenido) assert.equal(d['sap.cloud.service'], servicio, d.Name);
      });

      it('tiene un inbound de crossNavigation para el launchpad', () => {
        assert.ok(Object.keys(manifest['sap.app'].crossNavigation?.inbounds ?? {}).length > 0);
      });

      it('mta.yaml la construye como módulo html5 y lleva su zip al HTML5 repo', () => {
        const modulo = mta.modules.find((m: any) => m.type === 'html5' && m.path === `app/${app}`);
        assert.ok(modulo, `no hay módulo html5 con path app/${app}`);
        const artefactos = mta.modules.flatMap((m: any) => m['build-parameters']?.requires ?? [])
          .filter((r: any) => r.name === modulo.name).flatMap((r: any) => r.artifacts);
        assert.deepEqual(artefactos, [`${zip.archiveName}.zip`]);
        assert.ok(zip.additionalFiles.includes('xs-app.json'));
      });
    });
  }
});
