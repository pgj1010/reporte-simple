import cds from '@sap/cds';
import { Conexiones, Vuelos } from '#cds-models/ReporteService';

/**
 * D43 — URL relativa al servicio si la lectura trae `$apply` (totales, agregaciones), o undefined.
 * Se usa `req.req` (la petición OData de esta lectura) y no `req.http.req`: dentro de `$batch`,
 * que es como pide Fiori, `req.http.req` es el sobre del batch (`/$batch`), sin el `$apply`.
 */
function urlConApply(req: cds.Request): string | undefined {
  const url = (req as cds.Request & { req?: { url?: string } }).req?.url;
  if (!url) return undefined;
  const consulta = url.indexOf('?');
  if (consulta < 0 || !new URLSearchParams(url.slice(consulta + 1)).has('$apply')) return undefined;
  return url.replace(/^\//, '');
}

/**
 * R14 / D47 — totales de la cabecera del detalle de una conexión: campo `virtual` de `Conexiones`
 * → campo de `Vuelos` que suma el RAP (agregado predefinido `SUM`, D45).
 */
export const TOTALES = { TotalAsientosOcupados: 'SeatsOccupied', TotalCapacidad: 'SeatsMax' } as const;
type Total = keyof typeof TOTALES;
const CLAVES = ['CarrierId', 'ConnectionId'] as const;

/**
 * Largo máximo de la URL de cada petición de totales. Es el mismo límite a partir del cual CAP envolvería
 * el GET en un `$batch` (`cds.env.remote.max_get_url_length`, 1028 por defecto): por debajo, el RAP recibe
 * un GET simple. El detalle lee una conexión → una petición; una lista larga se reparte en varias.
 */
const largoMaximo = () => (cds.env as { remote?: { max_get_url_length?: number } }).remote?.max_get_url_length ?? 1028;

type Columna = { ref?: string[] } | string;
type Fila = Record<string, unknown>;
const esTotal = (c: Columna): c is { ref: [Total] } =>
  typeof c === 'object' && c.ref?.length === 1 && c.ref[0] in TOTALES;

/**
 * Qué totales pidió la lectura. Sin `$select` (`columns` vacío o con `*`) se devuelven todos los campos,
 * también los totales. No hace falta quitarlos de la consulta ni agregar las claves: al delegar, CAP ya
 * descarta los elementos `virtual` y pide siempre `CarrierId` y `ConnectionId` (comprobado con mutaciones
 * en la Etapa 4; lo vigila r14-totales-produccion: "al RAP nunca se le piden los campos virtual").
 */
function totalesPedidos(columnas: Columna[] | undefined): Total[] {
  const todos = Object.keys(TOTALES) as Total[];
  if (!columnas?.length) return todos;
  if (columnas.some(c => c === '*' || (typeof c === 'object' && c.ref?.[0] === '*'))) return todos;
  return columnas.filter(esTotal).map(c => c.ref[0]);
}

const literal = (v: unknown) => `'${String(v).replace(/'/g, "''")}'`;

/** URL de totales que el RAP real acepta (prueba A en SPEC.md): `filter` + `groupby` + `aggregate` sin alias. */
function urlDeTotales(filas: Fila[]): string {
  const filtro = filas.map(f => `(${CLAVES.map(c => `${c} eq ${literal(f[c])}`).join(' and ')})`).join(' or ');
  const medidas = [...new Set(Object.values(TOTALES))].join(',');
  return `Vuelos?$apply=${encodeURIComponent(`filter(${filtro})/groupby((${CLAVES.join(',')}),aggregate(${medidas}))`)}`;
}

/** Reparte las conexiones en grupos cuya URL de totales no pase de `largoMaximo()` (al menos una por grupo). */
function enGrupos(filas: Fila[]): Fila[][] {
  const grupos: Fila[][] = [];
  for (const fila of filas) {
    const ultimo = grupos.at(-1);
    if (ultimo && urlDeTotales([...ultimo, fila]).length + 1 <= largoMaximo()) ultimo.push(fila);
    else grupos.push([fila]);
  }
  return grupos;
}

export default class ReporteService extends cds.ApplicationService {
  async init() {
    const remote = await cds.connect.to('ZMAKS_SB_CONEXIONES');

    /** R14 / D47: suma en el RAP los vuelos de las conexiones leídas (una petición; varias solo si la URL no cabe). */
    const calcularTotales = async (filas: Fila[], pedidos: Total[]) => {
      const clave = (f: Fila) => CLAVES.map(c => String(f[c])).join('\u0000');
      for (const grupo of enGrupos(filas)) {
        const respuesta = await remote.send({ method: 'GET', path: urlDeTotales(grupo) });
        const sumas = new Map((([] as Fila[]).concat((respuesta as { value?: Fila[] })?.value ?? respuesta ?? [])).map(s => [clave(s), s]));
        for (const fila of grupo) {
          const suma = sumas.get(clave(fila));
          // Una conexión sin vuelos no aparece en el groupby: su total real es 0 (R14, decisión del usuario).
          for (const total of pedidos) fila[total] = Number(suma?.[TOTALES[total]] ?? 0);
        }
      }
    };

    this.on('READ', [Conexiones, Vuelos], async req => {
      // D43: CAP no delega `$apply` al servicio remoto (descarta `aggregate` y da 500 con `groupby`).
      // Las lecturas con `$apply` se reenvían tal cual al RAP, que agrega en su base de datos:
      // una petición y unos bytes, sin importar cuántas filas haya. La autorización de CAP
      // (`@requires`) ya se aplicó antes de llegar aquí; un `@restrict` por filas NO se aplicaría
      // a esta URL, por eso test/d43-totales.test.ts falla si se agrega uno.
      const url = urlConApply(req);
      if (url) return remote.send({ method: 'GET', path: url });

      // R14 / D47: los totales de la cabecera no existen en el RAP (CAP no se los pide, son `virtual`):
      // se calculan después con una petición groupby/aggregate (el Gateway no soporta la tabla analítica).
      const select = (req.query as { SELECT?: { columns?: Columna[] } }).SELECT;
      const pedidos = req.target?.name === Conexiones.name && select ? totalesPedidos(select.columns) : [];

      // Todas las demás lecturas se delegan al servicio RAP (R4): CAP no guarda copia de los datos.
      const resultado = await remote.run(req.query);
      if (pedidos.length && resultado != null) {
        const filas: Fila[] = Array.isArray(resultado) ? resultado : [resultado];
        if (filas.length) await calcularTotales(filas, pedidos);
      }
      return resultado;
    });

    return super.init();
  }
}
