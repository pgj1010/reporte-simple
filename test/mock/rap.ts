// Mock del RAP para desarrollo y test (D25). Lo carga `test/mocked.js` (gancho nativo de CAP:
// solo con `--with-mocks` y solo si `cds.env.features.test_mocks`, que es `false` en producción).
// `test/` no viaja en el build de producción (R5).
//
// Por qué existe: `cds import` trae `_Flight` SIN condición `on` (el `$metadata` no la publica),
// y SQLite no puede resolver `Conexiones(...)/_Flight` ni `$expand=_Flight` ("has no foreign keys").
// En producción no hace falta: CAP delega la navegación al RAP tal cual y el RAP la resuelve con
// su propia asociación (D26). Por eso el modelo (`srv/`, `srv/external`) no se toca.
import cds from '@sap/cds';

const REMOTO = 'ZMAKS_SB_CONEXIONES';
const CONEXIONES = `${REMOTO}.Conexiones`;
const VUELOS = `${REMOTO}.Vuelos`;

/**
 * Condición de `_Flight`, tal como la define el RAP (confirmada en ADT, `ZMAKS_I_CONEXIONES`):
 *   association [1..*] to ZMAKS_I_VUELOS as _Flight
 *   on $projection.CarrierId = _Flight.CarrierId and $projection.ConnectionId = _Flight.ConnectionId
 * Pares [campo de Conexiones, campo de Vuelos].
 */
export const CONDICION_FLIGHT = [
  ['CarrierId', 'CarrierId'],
  ['ConnectionId', 'ConnectionId'],
] as const;

type Fila = Record<string, unknown>;
type Columna = { ref?: string[]; as?: string; expand?: unknown[]; where?: unknown[]; orderBy?: unknown[]; limit?: unknown };

const esFlight = (paso: unknown) => paso === '_Flight' || (paso as { id?: string })?.id === '_Flight';

/** `where` de Vuelos que reproduce la condición de `_Flight` para una conexión. */
const condicionPara = (conexion: Fila) =>
  Object.fromEntries(CONDICION_FLIGHT.map(([deConexion, deVuelo]) => [deVuelo, conexion[deConexion]]));

/** Une varios `where` en CQN con `and`, cada uno entre paréntesis. */
const yTambien = (...partes: (unknown[] | undefined)[]) =>
  partes.filter(p => p?.length).flatMap((p, i) => (i ? ['and', { xpr: p }] : [{ xpr: p }]));

/**
 * Lo que el Gateway del RAP real rechaza en `$apply` (probado por el usuario en /IWFND/GW_CLIENT, 2026-11-10):
 * `concat` ("No implementado", /IWBEP/CM_V4S_RUN/002) y un alias igual a un campo ("Property name … is already
 * used"). El mock y el RAP simulado (test/rap-simulado.ts) rechazan lo mismo, para que ningún test pase con una
 * petición que el RAP real no acepta. Devuelve el mensaje de error, o undefined si el Gateway la aceptaría.
 */
export function rechazoDelGateway(url: string, campos: string[]): { status: number; message: string } | undefined {
  const i = url.indexOf('?');
  const apply = i < 0 ? null : new URLSearchParams(url.slice(i + 1)).get('$apply');
  if (!apply) return undefined;
  if (/\bconcat\s*\(/.test(apply)) return { status: 501, message: 'No implementado - La solicitud no se puede procesar (concat)' };
  for (const [, alias] of apply.matchAll(/\bwith\s+\w+\s+as\s+(\w+)/g))
    if (campos.includes(alias)) return { status: 400, message: `Property name '${alias}' is already used` };
  return undefined;
}

/** D43: ejecuta en el mock una lectura recibida como URL OData (incluye `$apply`), como lo haría el RAP. */
async function leerUrl(rap: cds.Service, req: cds.Request, path: string) {
  const nombre = path.replace(/^\//, '').split(/[(?/]/)[0];               // `req.path` ya puede traer el prefijo
  const entidad = rap.model.definitions[nombre.startsWith(`${REMOTO}.`) ? nombre : `${REMOTO}.${nombre}`] as { elements?: object } | undefined;
  const rechazo = rechazoDelGateway(path, Object.keys(entidad?.elements ?? {}));
  if (rechazo) return req.reject(rechazo.status, rechazo.message);
  const parseado = (cds as any).odata.parse('/' + path.replace(/^\//, ''), { service: rap });
  // Sin prefijar las entidades: el servicio simulado resuelve `Vuelos` / `Conexiones` por su cuenta.
  const consultas = Array.isArray(parseado) ? parseado : [parseado];
  const resultados = [];
  for (const q of consultas) resultados.push(...([] as unknown[]).concat(await rap.run(q) ?? []));
  return resultados;
}

export function registrar(rap: cds.Service) {
  rap.prepend(() => rap.on('READ', async (req, next) => {
    // 0) D43: lectura reenviada como URL (`remote.send({ method: 'GET', path })`, p. ej. con `$apply`).
    //    Un RAP real recibe la URL; aquí se convierte a CQN con el parser OData de CAP y se ejecuta.
    if (!(req.query as { SELECT?: unknown } | undefined)?.SELECT) return leerUrl(rap, req, (req as unknown as { path: string }).path);

    const select = (req.query as { SELECT: any }).SELECT;
    const ref: unknown[] = select.from?.ref ?? [];

    // 1) Navegación: Conexiones(...)/_Flight[(...)] → SELECT from Vuelos con la condición de _Flight.
    if (ref.length > 1 && esFlight(ref.at(-1))) {
      if (ref.length !== 2) return req.reject(501, 'Navegación no soportada por el mock');
      const padre = ref[0] as { id: string; where?: unknown[] };
      const conexiones: Fila[] = await rap.run(
        SELECT.from(CONEXIONES).columns(CONDICION_FLIGHT.map(([c]) => c)).where(padre.where ?? []));
      if (!conexiones.length) return req.reject(404);
      const porConexion = conexiones.map(c =>
        CONDICION_FLIGHT.flatMap(([deConexion, deVuelo], i) =>
          [...(i ? ['and'] : []), { ref: [deVuelo] }, '=', { val: c[deConexion] }]));
      const filtroFlight = porConexion.flatMap((p, i) => (i ? ['or', { xpr: p }] : [{ xpr: p }]));
      const paso = ref[1] as { where?: unknown[] };
      const q = SELECT.from(VUELOS);
      Object.assign(q.SELECT, select, {
        from: { ref: [VUELOS] },
        where: yTambien(filtroFlight, paso.where, select.where),
      });
      if (select.count) q.SELECT.count = true; // no es enumerable: Object.assign no lo copia ($count)
      return rap.run(q);
    }

    // 2) $expand=_Flight: se quita de la consulta y se resuelve con una lectura de Vuelos por conexión.
    const expansiones: Columna[] = (select.columns ?? []).filter((c: Columna) => c.expand && esFlight(c.ref?.[0]));
    if (!expansiones.length) return next();
    select.columns = select.columns.filter((c: Columna) => !expansiones.includes(c));
    const agregadas = CONDICION_FLIGHT.map(([c]) => c)
      .filter(c => !select.columns.some((col: Columna | string) => col === '*' || (col as Columna).ref?.[0] === c));
    select.columns.push(...agregadas.map(c => ({ ref: [c] })));

    const resultado = await next();
    const filas: Fila[] = resultado == null ? [] : Array.isArray(resultado) ? resultado : [resultado];
    for (const fila of filas) {
      for (const e of expansiones) {
        const q = SELECT.from(VUELOS).columns(e.expand as any).where(condicionPara(fila));
        if (e.where) q.where(e.where as any);
        if (e.orderBy) q.SELECT.orderBy = e.orderBy as any;
        if (e.limit) q.SELECT.limit = e.limit as any;
        fila[e.as ?? '_Flight'] = await rap.run(q);
      }
      for (const c of agregadas) delete fila[c];
    }
    return resultado;
  }));
}

/** Activa el mock si el servicio remoto está simulado. Lo llama `test/mocked.js` (no se activa
 *  al importar: los tests importan `CONDICION_FLIGHT` antes de que CAP levante los servicios). */
/**
 * D45: el RAP real tiene `@Aggregation.default: #SUM` en SeatsOccupied y SeatsMax (agregados predefinidos),
 * así que acepta `aggregate(SeatsOccupied)`. El mock lo simula copiando a cada entidad remota las anotaciones
 * de agregación de su proyección en ReporteService (annotations.cds), solo si el import no las trajo.
 */
function simularAgregadosPredefinidos(rap: cds.Service) {
  const srv = cds.services.ReporteService as cds.Service | undefined;
  for (const nombre of ['Conexiones', 'Vuelos']) {
    const proyeccion = srv?.entities[nombre] as Record<string, any> | undefined;
    const remota = rap.model.definitions[`${REMOTO}.${nombre}`] as Record<string, any> | undefined;
    if (!proyeccion || !remota) continue;
    for (const clave of Object.keys(proyeccion).filter(k => k.startsWith('@Aggregation.CustomAggregate#')))
      remota[clave] ??= proyeccion[clave];
    for (const [campo, e] of Object.entries<any>(proyeccion.elements))
      if (e['@Aggregation.default'] && remota.elements[campo]) remota.elements[campo]['@Aggregation.default'] ??= e['@Aggregation.default'];
  }
}

export function activar() {
  const rap = cds.services[REMOTO] as (cds.Service & { mocked?: boolean }) | undefined;
  if (!rap?.mocked) return;
  simularAgregadosPredefinidos(rap);
  registrar(rap);
  cds.log('mock').info(`mock de _Flight activo en ${REMOTO} (D25)`);
}
