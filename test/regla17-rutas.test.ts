// Regla técnica 17 (D19): las rutas de la app al servicio son relativas.
// Aplica a la app desplegable (webapp/manifest.json), no a los tests OPA generados (D20).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { raiz } from './helpers.ts';

const carpetaApp = join(raiz, 'app');
const manifests = readdirSync(carpetaApp, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(carpetaApp, d.name, 'webapp', 'manifest.json'))
  .filter((archivo) => existsSync(archivo));

/** Una ruta es absoluta si empieza con "/" o con un esquema (http:, https:, ...). */
const esAbsoluta = (uri: string) => uri.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(uri);

describe('Regla 17 — rutas relativas de la app al servicio (D19)', () => {
  it('hay al menos una app con manifest.json', () => {
    assert.ok(manifests.length > 0, 'no se encontró ningún app/*/webapp/manifest.json');
  });

  for (const archivo of manifests) {
    const nombre = relative(raiz, archivo);
    it(`${nombre}: todos los dataSources.*.uri son relativos`, () => {
      const manifest = JSON.parse(readFileSync(archivo, 'utf8'));
      const dataSources: Record<string, { uri?: string }> = manifest['sap.app']?.dataSources ?? {};
      assert.ok(Object.keys(dataSources).length > 0, 'el manifest no declara dataSources');
      for (const [id, ds] of Object.entries(dataSources)) {
        if (ds.uri === undefined) continue;
        assert.ok(!esAbsoluta(ds.uri), `dataSources.${id}.uri es absoluta: "${ds.uri}"`);
      }
    });
  }
});
