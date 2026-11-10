// R11 — Las anotaciones efectivas del servicio coinciden con la tabla "Semántica del reporte" de SPEC.md (D8, D22).
// El test lee la tabla directamente de SPEC.md: cambiar la tabla sin cambiar annotations.cds (o al revés) lo rompe.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { iniciar, alice, raiz } from './helpers.ts';

const { GET } = iniciar();

// ---------------------------------------------------------------------------
// Lectura de SPEC.md
// ---------------------------------------------------------------------------
const spec = readFileSync(join(raiz, 'SPEC.md'), 'utf8');

/** Filas de la primera tabla markdown bajo el encabezado dado, como objetos { columna: valor }. */
function tabla(encabezado: string): Record<string, string>[] {
  const inicio = spec.indexOf(encabezado);
  assert.ok(inicio >= 0, `SPEC.md no tiene la sección "${encabezado}"`);
  const lineas = spec.slice(inicio).split('\n').slice(1);
  const filas = lineas.slice(lineas.findIndex((l) => l.startsWith('|')));
  const fin = filas.findIndex((l) => !l.startsWith('|'));
  const [cabecera, , ...cuerpo] = filas.slice(0, fin < 0 ? undefined : fin);
  const celdas = (l: string) => l.split('|').slice(1, -1).map((c) => c.trim());
  const columnas = celdas(cabecera);
  return cuerpo.map((l) => Object.fromEntries(celdas(l).map((c, i) => [columnas[i], c])));
}

const sinComillas = (s: string) => s.replace(/`/g, '');
const ruta = (v: unknown) => (v && typeof v === 'object' && '=' in v ? (v as { '=': string })['='] : v);

interface Campo { campo: string; etiqueta: string; encabezado: string; ayuda: string; suma: boolean; filtro: boolean; obligatorio: boolean; orden?: number; texto?: string; moneda?: string; unidad?: string; valueHelp?: string }

function semantica(encabezado: string): Campo[] {
  return tabla(encabezado).map((f) => {
    const extra = f['Texto de / Unidad'];
    const de = (tipo: string) => extra.match(new RegExp(`${tipo}: \`(\\w+)\``))?.[1];
    const orden = Number(f['Columna (orden)']);
    return {
      campo: f['Campo'], etiqueta: f['Etiqueta'], encabezado: f['Encabezado'], ayuda: f['Ayuda'],
      suma: f['Medida'].includes('_SUM_'),
      filtro: f['Filtro'].includes('✅'), obligatorio: f['Obligatorio'].includes('✅'),
      orden: Number.isInteger(orden) ? orden : undefined,
      texto: de('texto'), moneda: de('moneda'), unidad: de('unidad'),
      valueHelp: f['Value help'].match(/^`(\w+)`/)?.[1],
    };
  });
}

const listas = {
  Conexiones: semantica('### Conexiones (List Report)'),
  Vuelos: semantica('### Vuelos (sección del detalle)'),
  Aeropuertos: semantica('### Aeropuertos (value help'),
};
const detalle = tabla('### Página de detalle');
const paginas = { Conexiones: 'Conexión', Vuelos: 'Vuelo' } as const;

// ---------------------------------------------------------------------------
// Anotaciones efectivas (modelo de ReporteService, con app/ cargada)
// ---------------------------------------------------------------------------
type Entidad = Record<string, any> & { elements: Record<string, Record<string, any>> };
const entidad = (nombre: string) => cds.services.ReporteService.entities[nombre] as unknown as Entidad;

/** Valor de una anotación, aceptando la forma estructurada o la aplanada del CSN. */
function anotacion(def: Record<string, any>, termino: string): any {
  if (termino in def) return def[termino];
  const prefijo = termino + '.';
  const partes = Object.keys(def).filter((k) => k.startsWith(prefijo));
  if (!partes.length) return undefined;
  return Object.fromEntries(partes.map((k) => [k.slice(prefijo.length), def[k]]));
}

// Tabla de cada entidad en el manifest (D41): [página, clave de controlConfiguration].
const manifest = JSON.parse(readFileSync(join(raiz, 'app/conexiones/webapp/manifest.json'), 'utf8'));
const tablas = {
  Conexiones: ['ConexionesList', '@com.sap.vocabularies.UI.v1.LineItem'],
  Vuelos: ['ConexionesObjectPage', '_Flight/@com.sap.vocabularies.UI.v1.LineItem'],
} as const;
const tablaEnManifest = (nombre: keyof typeof tablas) => {
  const [pagina, clave] = tablas[nombre];
  return manifest['sap.ui5'].routing.targets[pagina].options.settings.controlConfiguration?.[clave]?.tableSettings;
};

const comoTarget = (t: string) => (t.startsWith('@') || t.startsWith('_') ? t : '@' + t);

for (const [nombre, campos] of Object.entries(listas)) {
  describe(`R11 — ${nombre}: anotaciones = tabla de semántica`, () => {
    it('UI.LineItem: mismas columnas, orden, campo y etiqueta, con tipo UI.DataField', () => {
      const esperado = campos
        .filter((c) => c.orden !== undefined)
        .sort((a, b) => a.orden! - b.orden!)
        .map((c) => ({ $Type: 'UI.DataField', Label: c.etiqueta, Value: c.campo }));
      const efectivo = (entidad(nombre)['@UI.LineItem'] ?? []).map((d: any) => ({ $Type: d.$Type, Label: d.Label, Value: ruta(d.Value) }));
      assert.deepEqual(efectivo, esperado);
    });

    it('UI.SelectionFields = campos marcados como filtro', () => {
      const esperado = campos.filter((c) => c.filtro).map((c) => c.campo);
      const efectivo = (entidad(nombre)['@UI.SelectionFields'] ?? []).map((f: unknown) => ruta(f));
      assert.deepEqual(efectivo, esperado);
    });

    it('filtros obligatorios = campos marcados como obligatorios', () => {
      const esperado = campos.filter((c) => c.obligatorio).map((c) => c.campo);
      const efectivo = (anotacion(entidad(nombre), '@Capabilities.FilterRestrictions')?.RequiredProperties ?? []).map((f: unknown) => ruta(f));
      assert.deepEqual(efectivo, esperado);
    });

    it('textos (@Common.Text) e importes (@Measures.ISOCurrency) según la tabla', () => {
      const els = entidad(nombre).elements;
      for (const c of campos) {
        assert.equal(ruta(els[c.campo]['@Common.Text']), c.texto, `${c.campo}: @Common.Text`);
        assert.equal(ruta(els[c.campo]['@Measures.ISOCurrency']), c.moneda, `${c.campo}: @Measures.ISOCurrency`);
      }
    });

    it('unidades (@Measures.Unit) según la tabla (D23)', () => {
      const els = entidad(nombre).elements;
      for (const c of campos) assert.equal(ruta(els[c.campo]['@Measures.Unit']), c.unidad, `${c.campo}: @Measures.Unit`);
    });

    it('etiqueta del campo (@Common.Label) = columna Etiqueta (D24)', () => {
      const els = entidad(nombre).elements;
      for (const c of campos) assert.equal(els[c.campo]['@Common.Label'], c.etiqueta, `${c.campo}: @Common.Label`);
    });

    it('encabezado (@Common.Heading) y ayuda (@Common.QuickInfo) = columnas Encabezado y Ayuda (D40)', () => {
      const els = entidad(nombre).elements;
      for (const c of campos) {
        assert.equal(els[c.campo]['@Common.Heading'], c.encabezado, `${c.campo}: @Common.Heading`);
        assert.equal(els[c.campo]['@Common.QuickInfo'], c.ayuda, `${c.campo}: @Common.QuickInfo`);
      }
    });

    it('agregados predefinidos (columna Medida = _SUM_, D38, D45): @Aggregation.default #SUM y CustomAggregate', () => {
      const def = entidad(nombre);
      for (const c of campos) {
        const e = def.elements[c.campo];
        assert.equal(e['@Aggregation.default']?.['#'], c.suma ? 'SUM' : undefined, `${c.campo}: @Aggregation.default`);
        assert.equal(def[`@Aggregation.CustomAggregate#${c.campo}`] !== undefined, c.suma, `${c.campo}: @Aggregation.CustomAggregate`);
      }
    });

    it('sin tabla analítica (D47): ni @Analytics.Measure ni ApplySupported; ResponsiveTable con exportación (D41)', () => {
      const def = entidad(nombre);
      for (const c of campos) assert.equal(def.elements[c.campo]['@Analytics.Measure'], undefined, `${c.campo}: @Analytics.Measure`);
      assert.equal(anotacion(def, '@Aggregation.ApplySupported'), undefined, 'ApplySupported activaría la analítica de Fiori');
      if (!(nombre in tablas)) return; // Aeropuertos: solo se usa en el diálogo del value help, sin tabla en el manifest
      const tabla = tablaEnManifest(nombre as keyof typeof tablas);
      assert.equal(tabla?.type, 'ResponsiveTable', 'el Gateway no soporta concat/top/$count que pide la AnalyticalTable (D47)');
      assert.equal(tabla?.enableExport, true, 'exportar a Excel');
    });

    it('value help (columna Value help, D50): @Common.ValueList propio, sin ValueListReferences del RAP', () => {
      const els = entidad(nombre).elements;
      for (const c of campos) {
        const vl = anotacion(els[c.campo], '@Common.ValueList');
        assert.equal(els[c.campo]['@Common.ValueListReferences'] ?? undefined, undefined, `${c.campo}: ValueListReferences del RAP`);
        assert.equal(anotacion(els[c.campo], '@Common.ValueListMapping')?.CollectionPath ?? undefined, undefined, `${c.campo}: ValueListMapping`);
        if (!c.valueHelp) { assert.equal(vl, undefined, `${c.campo}: no lleva value help`); continue; }
        const columnas = listas[c.valueHelp as keyof typeof listas]
          .filter((v) => v.orden !== undefined).sort((a, b) => a.orden! - b.orden!).map((v) => v.campo);
        assert.equal(vl?.CollectionPath, c.valueHelp, `${c.campo}: CollectionPath`);
        assert.deepEqual(vl.Parameters.map((p: any) => ({ $Type: p.$Type, Local: ruta(p.LocalDataProperty), Prop: p.ValueListProperty })), [
          { $Type: 'Common.ValueListParameterInOut', Local: c.campo, Prop: columnas[0] },
          ...columnas.slice(1).map((v) => ({ $Type: 'Common.ValueListParameterDisplayOnly', Local: undefined, Prop: v })),
        ], `${c.campo}: parámetros del value help`);
      }
    });

    it('la tabla incluye todos los campos de la entidad (ningún texto del RAP sin traducir, D40)', () => {
      const delModelo = Object.entries(entidad(nombre).elements)
        .filter(([, e]) => !e.isAssociation && e.type !== 'cds.Association' && e.type !== 'cds.Composition')
        .map(([n]) => n).sort();
      assert.deepEqual(campos.map((c) => c.campo).sort(), delModelo);
    });
  });

  if (nombre in paginas) describe(`R11 — ${nombre}: página de detalle = tabla de semántica`, () => {
    const filas = detalle.filter((f) => f['Página'] === paginas[nombre as keyof typeof paginas]);
    const fila = (elemento: string) => filas.find((f) => f['Elemento'].startsWith(elemento));

    it('HeaderInfo: tipo, título y descripción', () => {
      const info = anotacion(entidad(nombre), '@UI.HeaderInfo');
      const [singular, plural] = fila('Tipo')!['Contenido (en orden)'].split('(')[0].split('/').map((s) => s.trim());
      assert.equal(info.TypeName, singular);
      assert.equal(info.TypeNamePlural, plural);
      for (const parte of ['Title', 'Description'] as const) {
        const f = fila(parte === 'Title' ? 'Título' : 'Descripción');
        const efectivo = info[parte] ?? (info[`${parte}.$Type`] ? { $Type: info[`${parte}.$Type`], Value: info[`${parte}.Value`] } : undefined);
        if (!f) { assert.equal(efectivo, undefined, `HeaderInfo.${parte} no está en la tabla`); continue; }
        assert.equal(efectivo?.$Type, 'UI.DataField', `HeaderInfo.${parte}.$Type`);
        assert.equal(ruta(efectivo?.Value), sinComillas(f['Contenido (en orden)']), `HeaderInfo.${parte}.Value`);
      }
    });

    it('HeaderFacets: DataPoints de la cabecera, en orden', () => {
      const esperado = [...fila('Cabecera')!['Contenido (en orden)'].matchAll(/\d\. ([^(]+?) \(`DataPoint#(\w+)` → `(\w+)`\)/g)]
        .map(([, label, dp, campo]) => ({ label, target: `@UI.DataPoint#${dp}`, dp, campo }));
      const efectivo = entidad(nombre)['@UI.HeaderFacets'] ?? [];
      assert.deepEqual(efectivo.map((f: any) => ({ $Type: f.$Type, Label: f.Label, Target: f.Target })),
        esperado.map((e) => ({ $Type: 'UI.ReferenceFacet', Label: e.label, Target: e.target })));
      for (const e of esperado) {
        assert.equal(ruta(anotacion(entidad(nombre), `@UI.DataPoint#${e.dp}`)?.Value), e.campo, `DataPoint#${e.dp}.Value`);
      }
    });

    it('Facets: secciones (ID, etiqueta, destino) y contenido de UI.Identification', () => {
      const secciones = filas
        .map((f) => ({ m: f['Elemento'].match(/Sección \d+ "([^"]+)" \(`(\w+)` → `([^`]+)`\)/), contenido: f['Contenido (en orden)'] }))
        .filter((s) => s.m);
      const efectivo = entidad(nombre)['@UI.Facets'] ?? [];
      assert.deepEqual(efectivo.map((f: any) => ({ $Type: f.$Type, ID: f.ID, Label: f.Label, Target: f.Target })),
        secciones.map(({ m }) => ({ $Type: 'UI.ReferenceFacet', ID: m![2], Label: m![1], Target: comoTarget(m![3]) })));

      const identificacion = secciones.find(({ m }) => comoTarget(m![3]) === '@UI.Identification');
      const esperado = identificacion
        ? [...identificacion.contenido.matchAll(/([^·(]+?) \(`(\w+)`\)/g)].map(([, label, campo]) => ({ $Type: 'UI.DataField', Label: label.trim(), Value: campo }))
        : [];
      const ident = (entidad(nombre)['@UI.Identification'] ?? []).map((d: any) => ({ $Type: d.$Type, Label: d.Label, Value: ruta(d.Value) }));
      assert.deepEqual(ident, esperado);
    });
  });
}

describe('R11 — $metadata publicado (D22)', () => {
  it('no queda ningún tipo con el alias SAP__UI y los Target de los facets son AnnotationPath', async () => {
    const { data } = await GET('/odata/v4/reporte/$metadata', alice);
    const xml = String(data);
    assert.ok(!xml.includes('SAP__UI'), 'el $metadata contiene tipos SAP__UI.* que Fiori no reconoce');
    assert.ok(!/Property="Target" Path=/.test(xml), 'hay facets con Target como Path en vez de AnnotationPath');
    assert.match(xml, /Property="Target" AnnotationPath="_Flight\/@UI.LineItem"/);
    assert.ok(!xml.includes('ValueListReferences'), 'quedan ValueListReferences del RAP (apuntan a un $metadata que CAP no publica, D50)');
    assert.ok(!xml.includes('ValueListMapping'), 'queda el ValueListMapping de país del F4 (I_CountryVH no se expone, D51)');
  });
});
