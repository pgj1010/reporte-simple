// R10 — Los mensajes de error visibles al usuario están en español.
// D11: siempre en español, aunque el navegador pida otro idioma.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const raiz = import.meta.dirname + '/..';
const test = cds.test('serve', '--project', raiz, '--with-mocks', '--in-memory');
const auth = { username: 'alice', password: '' };

/** Ejecuta la petición y devuelve { status, message } del error OData. */
async function error(peticion: Promise<unknown>): Promise<{ status: number; message: string }> {
  try {
    await peticion;
  } catch (e: any) {
    const status = e.response?.status ?? e.status;
    const message = e.response?.data?.error?.message ?? e.message;
    return { status, message };
  }
  assert.fail('se esperaba un error');
}

// Idiomas que puede mandar el navegador; el mensaje debe ser el mismo en todos.
const idiomas = [undefined, 'en', 'de', 'es'];

describe('R10 — mensajes de error en español', () => {
  for (const idioma of idiomas) {
    const headers = idioma ? { 'Accept-Language': idioma } : {};
    const titulo = `Accept-Language: ${idioma ?? '(ninguno)'}`;

    describe(titulo, () => {
      it('escritura sobre entidad de solo lectura → 405 en español', async () => {
        const { status, message } = await error(
          test.POST('/odata/v4/reporte/Conexiones', {}, { auth, headers }));
        assert.equal(status, 405);
        assert.equal(message, 'La entidad "ReporteService.Conexiones" es de solo lectura');
      });

      it('registro inexistente → 404 en español', async () => {
        const { status, message } = await error(
          test.GET("/odata/v4/reporte/Conexiones(CarrierId='XX',ConnectionId='9999')", { auth, headers }));
        assert.equal(status, 404);
        assert.equal(message, 'No encontrado');
      });
    });
  }

  it('todas las claves de mensajes de CAP tienen texto propio en _i18n/messages_es.properties', async () => {
    const { readFileSync } = await import('node:fs');
    const { createRequire } = await import('node:module');
    const claves = (archivo: string) => new Set(
      readFileSync(archivo, 'utf8').split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('#'))
        .map(l => l.split('=')[0].trim()));
    const require = createRequire(import.meta.url);
    const deCap = claves(require.resolve('@sap/cds/_i18n/messages.properties'));
    const propias = claves(raiz + '/_i18n/messages_es.properties');
    assert.deepEqual([...deCap].filter(k => !propias.has(k)), [], 'claves de CAP sin traducir');
  });
});
