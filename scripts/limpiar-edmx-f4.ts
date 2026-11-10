// D49 — Prepara para `cds import` el $metadata de un servicio de value help (F4) de RAP.
//
// Los servicios F4 de RAP (`/srvd_f4/...`) referencian al servicio padre con el alias
// `SAP__ParentService` y anotan sus campos (`ValueListMapping` sobre `SAP__ParentService.<Tipo>/<campo>`).
// `cds import` no puede resolver esa referencia ("Could not resolve the schema SAP__ParentService...").
// Este script deja intacto el .edmx descargado y escribe una COPIA sin la referencia ni las anotaciones
// sobre el servicio padre (la relación campo → value help la define CAP en app/<reporte>/annotations.cds).
//
// Uso:  node scripts/limpiar-edmx-f4.ts <original.edmx> <copia.edmx>
//       cds import <copia.edmx> --as cds --force && npm install
import { readFileSync, writeFileSync } from 'node:fs';

const [original, copia] = process.argv.slice(2);
if (!original || !copia) {
  console.error('Uso: node scripts/limpiar-edmx-f4.ts <original.edmx> <copia.edmx>');
  process.exit(1);
}

const xml = readFileSync(original, 'utf8');
const alias = /<edmx:Reference Uri="[^"]*">\s*<edmx:Include Namespace="[^"]*" Alias="SAP__ParentService"\/>\s*<\/edmx:Reference>\s*/g;
const anotaciones = /<Annotations Target="SAP__ParentService\.[^"]*">[\s\S]*?<\/Annotations>\s*/g;
const referencias = xml.match(alias)?.length ?? 0;
const bloques = xml.match(anotaciones)?.length ?? 0;
if (!referencias) {
  console.error(`${original} no referencia a SAP__ParentService: se puede importar tal cual.`);
  process.exit(1);
}
const limpio = xml.replace(alias, '').replace(anotaciones, '');
if (limpio.includes('SAP__ParentService')) {
  console.error(`Quedan usos de SAP__ParentService en ${original}: revisar el script.`);
  process.exit(1);
}
writeFileSync(copia, limpio);
console.log(`${copia}: quitadas ${referencias} referencia(s) a SAP__ParentService y ${bloques} bloque(s) de anotaciones.`);
