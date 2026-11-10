// R12 — Los importes se muestran con sus decimales completos (p. ej. 422.94 USD): el $metadata de
// ReporteService publica cada Edm.Decimal con la misma Precision y Scale que el RAP, y los valores
// llegan sin redondear. El formato final ("422,94 USD") lo pone Fiori: [manual] en PRUEBAS_MANUALES.md.
// Recorre TODOS los Edm.Decimal del .edmx del RAP, así que también cubre campos que se agreguen después.
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iniciar, alice, raiz } from './helpers.ts';

const { GET } = iniciar();

type Decimal = { entidad: string; campo: string; precision?: string; scale?: string };

const atributo = (tag: string, nombre: string) => tag.match(new RegExp(`\\s${nombre}="([^"]*)"`))?.[1];

/** Edm.Decimal por entidad, leyendo los <EntityType> de un $metadata. `nombreDe` traduce el tipo a la entidad. */
function decimales(xml: string, nombreDe: (tipo: string) => string | undefined): Decimal[] {
  const lista: Decimal[] = [];
  for (const [, tipo, cuerpo] of xml.matchAll(/<EntityType Name="([^"]+)"[^>]*>([\s\S]*?)<\/EntityType>/g)) {
    const entidad = nombreDe(tipo);
    if (!entidad) continue;
    for (const [tag] of cuerpo.matchAll(/<Property\s[^>]*\/?>/g)) {
      if (atributo(tag, 'Type') !== 'Edm.Decimal') continue;
      lista.push({ entidad, campo: atributo(tag, 'Name')!, precision: atributo(tag, 'Precision'), scale: atributo(tag, 'Scale') });
    }
  }
  return lista.sort((a, b) => `${a.entidad}.${a.campo}`.localeCompare(`${b.entidad}.${b.campo}`));
}

// RAP: el nombre de la entidad es el del EntitySet (p. ej. VuelosType → Vuelos).
const edmx = readFileSync(`${raiz}/srv/external/ZMAKS_SB_CONEXIONES.edmx`, 'utf8');
const conjuntos = new Map([...edmx.matchAll(/<EntitySet Name="([^"]+)" EntityType="[^"]*\.([^".]+)"/g)].map(([, set, tipo]) => [tipo, set]));
const delRap = decimales(edmx, tipo => conjuntos.get(tipo));

describe('R12 — importes con sus decimales completos', () => {
  let publicados: Decimal[];
  before(async () => {
    const { data } = await GET('/odata/v4/reporte/$metadata', alice);
    publicados = decimales(data, tipo => tipo); // en ReporteService el tipo se llama como la entidad
  });

  it('control: el RAP tiene campos Edm.Decimal (al menos Vuelos.Price)', () => {
    assert.ok(delRap.some(d => d.entidad === 'Vuelos' && d.campo === 'Price'), JSON.stringify(delRap));
  });

  it('cada Edm.Decimal del RAP se publica con la misma Precision y Scale', () => {
    const delRapExpuestos = delRap.filter(d => publicados.some(p => p.entidad === d.entidad && p.campo === d.campo));
    assert.deepEqual(delRapExpuestos.length, delRap.length, 'hay campos decimales del RAP que ReporteService no publica como Edm.Decimal');
    assert.deepEqual(publicados.filter(p => delRap.some(d => d.entidad === p.entidad && d.campo === p.campo)), delRap);
  });

  it('Vuelos.Price se publica con Scale="variable" (decimales según la moneda)', () => {
    assert.deepEqual(publicados.find(p => p.entidad === 'Vuelos' && p.campo === 'Price'),
      { entidad: 'Vuelos', campo: 'Price', precision: '16', scale: 'variable' });
  });

  it('el precio de AA 0017 llega sin redondear: 422.94 USD', async () => {
    const { data } = await GET(
      "/odata/v4/reporte/Vuelos(CarrierId='AA',ConnectionId='0017',FlightDate=2026-12-01)?$select=Price,CurrencyCode", alice);
    assert.equal(Number(data.Price), 422.94);
    assert.equal(data.CurrencyCode, 'USD');
  });
});
