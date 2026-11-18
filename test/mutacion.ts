// Prueba de mutación de las reglas principales (D3, D10): `npm run test:mutacion`.
//
// Cada mutación se aplica sobre una COPIA TEMPORAL del proyecto: los archivos reales
// nunca se modifican (se verifica con un hash antes y después). Por cada mutación:
//   1. control: en la copia sin mutar, los tests de la regla pasan;
//   2. se aplica la mutación en la copia y se comprueba que cambió algo;
//   3. los tests de la regla deben FALLAR (mutación detectada).
// No termina en .test.ts para que `npm test` no lo ejecute.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';

const raiz = path.resolve(import.meta.dirname, '..');

interface Mutacion {
  regla: string;
  descripcion: string;
  archivo: string | string[];   // relativo a la raíz del proyecto; con varios, se muta cada uno (D71)
  quitar: RegExp;    // texto que se elimina (todas las apariciones)
  poner?: string;    // texto que lo reemplaza (por defecto nada); admite $1, $2… de `quitar` (D72)
  tests: string[];   // tests de la regla, relativos a la raíz
}

const mutaciones: Mutacion[] = [
  {
    regla: 'R3',
    descripcion: "quitar @requires: 'Visualizador' de ReporteService",
    archivo: 'srv/service.cds',
    quitar: /^\s*@requires\s*:\s*'Visualizador'.*\n/gm,
    tests: ['test/r3-autenticacion.test.ts'],
  },
  {
    regla: 'R2',
    descripcion: 'quitar @readonly de Conexiones, Vuelos y Aeropuertos',
    archivo: 'srv/service.cds',
    quitar: /^\s*@readonly\s*\n/gm,
    tests: ['test/r2-solo-lectura.test.ts'],
  },
  {
    regla: 'R15 (R3)',
    descripcion: "quitar @requires: 'Visualizador' de ReporteAgentService (D70)",
    archivo: 'srv/agent-service.cds',
    quitar: /^\s*@requires\s*:\s*'Visualizador'.*\n/gm,
    tests: ['test/r15-agente.test.ts'],
  },
  {
    // D71: también de ReporteService, porque las proyecciones de ReporteAgentService heredan el @readonly de
    // sus entidades; quitándolo solo del servicio agente, las escrituras siguen en 405 y solo lo nota el test
    // del modelo. Así la mutación prueba el comportamiento (INSERT/UPDATE/DELETE → 405).
    regla: 'R15 (R2)',
    descripcion: 'quitar @readonly de ReporteAgentService y de las entidades de ReporteService que proyecta (D70, D71)',
    archivo: ['srv/agent-service.cds', 'srv/service.cds'],
    quitar: /^\s*@readonly\s*\n/gm,
    tests: ['test/r15-agente.test.ts'],
  },
  {
    regla: 'R16 (R3)',
    descripcion: "quitar @requires: 'Visualizador' de ReporteAgentService: ocupacionPorConexion queda abierta a sinrol (D72)",
    archivo: 'srv/agent-service.cds',
    quitar: /^\s*@requires\s*:\s*'Visualizador'.*\n/gm,
    tests: ['test/r16-ocupacion.test.ts'],
  },
  {
    regla: 'R16 (solo lectura)',
    descripcion: 'declarar ocupacionPorConexion como action en vez de function (la tool dejaría de ser de solo lectura, D72)',
    archivo: 'srv/agent-service.cds',
    quitar: /^(\s*)function(\s+ocupacionPorConexion\b)/m,
    poner: '$1action$2',
    tests: ['test/r16-ocupacion.test.ts'],
  },
  {
    // D43: con `remote.run` y un groupBy en CQN, el mock (SQLite) sí suma, pero en producción CAP no delega el
    // `aggregate` al RAP. Esta mutación solo la puede detectar el test de producción (RAP simulado).
    regla: 'R16 (D43)',
    descripcion: 'sumar con remote.run(SELECT … groupBy) en CQN en vez de la URL $apply al RAP (D43, D72)',
    archivo: 'srv/agent-service.ts',
    quitar: /remote\.send\(\{ method: 'GET', path: urls\.sumas \}\)/,
    poner: "remote.run(SELECT.from('ZMAKS_SB_CONEXIONES.Vuelos')"
      + ".columns('CarrierId', 'ConnectionId', 'sum(SeatsOccupied) as SeatsOccupied', 'sum(SeatsMax) as SeatsMax')"
      + ".where(aerolinea ? { CarrierId: aerolinea } : {}).groupBy('CarrierId', 'ConnectionId'))",
    tests: ['test/r16-ocupacion.test.ts', 'test/r16-ocupacion-produccion.test.ts'],
  },
];

// Lo que no se copia: dependencias (se enlazan), git y salidas generadas.
const excluir = new Set(['node_modules', '.git', '_out', 'gen', 'mta_archives']);

const hash = (archivo: string) => createHash('sha256').update(readFileSync(archivo)).digest('hex');

function copiarProyecto(): string {
  const destino = mkdtempSync(path.join(tmpdir(), 'mutacion-'));
  cpSync(raiz, destino, {
    recursive: true,
    filter: origen => !excluir.has(path.relative(raiz, origen).split(path.sep)[0]),
  });
  symlinkSync(path.join(raiz, 'node_modules'), path.join(destino, 'node_modules'), 'dir');
  return destino;
}

function correrTests(cwd: string, tests: string[]): { ok: boolean; resumen: string } {
  const r = spawnSync(process.execPath, ['--test', ...tests], {
    cwd,
    encoding: 'utf8',
    // Sin colores (igual que SIN_COLOR de test/helpers.ts): el resumen se lee con regex.
    env: { ...process.env, CDS_PLUGIN_UI5_ACTIVE: 'false', CDS_TYPESCRIPT: 'false', NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const salida = stripVTControlCharacters(`${r.stdout}\n${r.stderr}`);
  const resumen = (salida.match(/^ℹ (pass|fail) \d+$/gm) ?? []).join(' · ');
  return { ok: r.status === 0, resumen };
}

let sobrevivientes = 0;

for (const m of mutaciones) {
  const archivos = ([] as string[]).concat(m.archivo);
  const hashesAntes = archivos.map(a => hash(path.join(raiz, a)));
  const copia = copiarProyecto();
  console.log(`\n=== Mutación ${m.regla}: ${m.descripcion}`);
  console.log(`    copia temporal: ${copia}`);
  try {
    const control = correrTests(copia, m.tests);
    console.log(`    1) control sin mutar: ${control.ok ? 'pasa ✔' : 'FALLA ✖'} (${control.resumen})`);
    if (!control.ok) throw new Error('los tests de la regla fallan sin mutación; la prueba no es válida');

    let quitados = 0;
    for (const a of archivos) {
      const archivoCopia = path.join(copia, a);
      const original = readFileSync(archivoCopia, 'utf8');
      const mutado = original.replace(m.quitar, m.poner ?? '');
      if (mutado === original) throw new Error(`la mutación no cambió ${a} (¿cambió el texto?)`);
      writeFileSync(archivoCopia, mutado);
      quitados += original.length - mutado.length;
    }
    console.log(`    2) mutación aplicada en la copia (${m.poner === undefined ? `${quitados} caracteres quitados` : 'texto reemplazado'}${archivos.length > 1 ? ` en ${archivos.length} archivos` : ''})`);

    const mutante = correrTests(copia, m.tests);
    if (mutante.ok) {
      sobrevivientes++;
      console.log(`    3) ✖ MUTACIÓN NO DETECTADA: los tests de ${m.regla} siguen pasando (${mutante.resumen})`);
    } else {
      console.log(`    3) ✔ mutación detectada: los tests de ${m.regla} fallan (${mutante.resumen})`);
    }
  } catch (e) {
    sobrevivientes++;
    console.log(`    ✖ error: ${(e as Error).message}`);
  } finally {
    rmSync(copia, { recursive: true, force: true });
    archivos.forEach((a, i) => {
      const intacto = hash(path.join(raiz, a)) === hashesAntes[i];
      console.log(`    archivo real ${a}: ${intacto ? 'sin cambios ✔' : 'MODIFICADO ✖'}`);
      if (!intacto) sobrevivientes++;
    });
  }
}

console.log(sobrevivientes === 0
  ? `\nResultado: ${mutaciones.length}/${mutaciones.length} mutaciones detectadas ✔`
  : `\nResultado: ${sobrevivientes} problema(s) ✖`);
process.exitCode = sobrevivientes === 0 ? 0 : 1;
