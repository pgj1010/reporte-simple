// R13 — La app se muestra siempre en español (textos de la app y de Fiori, formato de números y
// fechas), sin importar el idioma del navegador (D34, alineado con D11).
// Revisa la configuración de cada app en app/*/webapp (no necesita navegador); lo que se ve en
// pantalla ("422,94 USD", fechas) es [manual] en PRUEBAS_MANUALES.md.
// D33: apps de un solo idioma con supportedLocales [""] y fallbackLocale "": i18n.properties sin sufijo.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { raiz } from './helpers.ts';

const apps = readdirSync(path.join(raiz, 'app'), { withFileTypes: true })
  .filter(d => d.isDirectory() && existsSync(path.join(raiz, 'app', d.name, 'webapp', 'manifest.json')))
  .map(d => d.name);

type Bundle = { donde: string; supportedLocales?: unknown; fallbackLocale?: unknown; archivo?: string };

/** Los bundles i18n del manifest: sap.app.i18n y cada modelo ResourceModel. */
function bundles(manifest: any): Bundle[] {
  const lista: Bundle[] = [];
  const app = manifest['sap.app'].i18n;
  lista.push(typeof app === 'string'
    ? { donde: 'sap.app.i18n', archivo: app }
    : { donde: 'sap.app.i18n', ...app, archivo: app?.bundleUrl });
  for (const [nombre, modelo] of Object.entries<any>(manifest['sap.ui5']?.models ?? {})) {
    if (modelo.type !== 'sap.ui.model.resource.ResourceModel') continue;
    const s = modelo.settings ?? {};
    const archivo = modelo.uri ?? s.bundleUrl
      ?? (s.bundleName && s.bundleName.split('.').slice(1).join('/') + '.properties'); // "<id>.i18n.i18n"
    lista.push({ donde: `sap.ui5.models["${nombre}"]`, supportedLocales: s.supportedLocales, fallbackLocale: s.fallbackLocale, archivo });
  }
  return lista;
}

describe('R13 — la app se muestra siempre en español', () => {
  it('control: hay al menos una app Fiori', () => assert.ok(apps.length > 0));

  for (const app of apps) {
    const webapp = path.join(raiz, 'app', app, 'webapp');
    const manifest = JSON.parse(readFileSync(path.join(webapp, 'manifest.json'), 'utf8'));
    const html = readFileSync(path.join(webapp, 'index.html'), 'utf8');

    describe(`app/${app}`, () => {
      it('index.html: <html lang="es">', () => {
        assert.match(html, /<html\b[^>]*\blang="es"/);
      });

      it('index.html: UI5 arranca en español (data-sap-ui-language="es")', () => {
        const bootstrap = html.match(/<script\b[^>]*id="sap-ui-bootstrap"[^>]*>/)?.[0] ?? '';
        assert.match(bootstrap, /\bdata-sap-ui-language="es"/);
      });

      for (const b of bundles(manifest)) {
        it(`${b.donde}: un solo idioma (supportedLocales [""], fallbackLocale "", D33)`, () => {
          assert.deepEqual(b.supportedLocales, ['']);
          assert.equal(b.fallbackLocale, '');
        });

        it(`${b.donde}: el archivo ${b.archivo} existe`, () => {
          assert.ok(b.archivo && existsSync(path.join(webapp, b.archivo)), `no existe webapp/${b.archivo}`);
        });
      }

      it('no hay archivos i18n de otro idioma (con supportedLocales [""] UI5 nunca los cargaría)', () => {
        const conIdioma = (readdirSync(webapp, { recursive: true }) as string[])
          .filter(f => !f.split(path.sep).includes('test') && /_[a-z]{2}(_[A-Z]{2})?\.properties$/.test(f));
        assert.deepEqual(conIdioma, []);
      });
    });
  }
});
