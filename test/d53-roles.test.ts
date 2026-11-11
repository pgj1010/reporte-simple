// R3 / D53 — Los roles que pide el modelo (@requires / @restrict) existen en xs-security.json:
// scope $XSAPPNAME.<rol>, role template que lo referencia y role collection que lo entrega.
// Sin esto, un rol escrito distinto en CDS y en XSUAA daría 403 a todos los usuarios desplegados.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { raiz } from './helpers.ts';

// Pseudo-roles de CAP: no se declaran en XSUAA.
const PSEUDO = new Set(['authenticated-user', 'any', 'system-user', 'internal-user']);

const lista = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]) as string[];

async function rolesDelModelo(): Promise<Set<string>> {
  const csn = await cds.load(raiz + '/srv');
  const roles = new Set<string>();
  for (const def of Object.values(csn.definitions ?? {}) as any[]) {
    for (const r of lista(def['@requires'])) roles.add(r);
    for (const g of lista(def['@restrict']) as any[]) for (const r of lista(g.to)) roles.add(r);
  }
  return new Set([...roles].filter(r => !PSEUDO.has(r)));
}

describe('R3 / D53 — roles del modelo declarados en xs-security.json', async () => {
  const xs = JSON.parse(await readFile(raiz + '/xs-security.json', 'utf8'));
  const roles = await rolesDelModelo();

  it('el modelo pide al menos un rol propio (Visualizador)', () => {
    assert.ok(roles.has('Visualizador'), `roles del modelo: ${[...roles].join(', ') || '(ninguno)'}`);
  });

  for (const rol of roles) {
    const scope = `$XSAPPNAME.${rol}`;
    it(`${rol}: hay scope ${scope}`, () => {
      assert.ok(xs.scopes.some((s: any) => s.name === scope));
    });
    it(`${rol}: hay role template que referencia el scope`, () => {
      assert.ok(xs['role-templates'].some((t: any) => t['scope-references'].includes(scope)));
    });
    it(`${rol}: hay role collection con ese role template`, () => {
      const plantillas = xs['role-templates'].filter((t: any) => t['scope-references'].includes(scope)).map((t: any) => `$XSAPPNAME.${t.name}`);
      assert.ok(xs['role-collections'].some((c: any) => c['role-template-references'].some((r: string) => plantillas.includes(r))));
    });
  }

  it('xs-security.json no declara scopes que el modelo no usa', () => {
    const sobran = xs.scopes.map((s: any) => s.name.replace('$XSAPPNAME.', '')).filter((r: string) => !roles.has(r));
    assert.deepEqual(sobran, []);
  });
});
