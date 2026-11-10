// D35 — El lint de las apps Fiori (`npm run lint`: ESLint con @sap-ux/eslint-plugin-fiori-tools en cada
// workspace app/*) corre dentro de `npm test` y debe terminar sin errores. Tarda ~3 s.
// Motivo: con TypeScript 7 el lint se caía (typescript-eslint pide typescript <6.1) y nadie lo notaba;
// así `npm test` detecta tanto un lint roto como reglas de Fiori incumplidas.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { raiz } from './helpers.ts';

describe('D35 — lint de las apps Fiori', () => {
  it('npm run lint termina sin errores', async () => {
    try {
      await promisify(execFile)('npm', ['run', 'lint'], { cwd: raiz });
    } catch (e: any) {
      assert.fail(`npm run lint falló (código ${e.code}):\n${e.stdout}\n${e.stderr}`);
    }
  });
});
