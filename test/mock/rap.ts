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

export function registrar(rap: cds.Service) {
  rap.prepend(() => rap.on('READ', async (req, next) => {
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
export function activar() {
  const rap = cds.services[REMOTO] as (cds.Service & { mocked?: boolean }) | undefined;
  if (!rap?.mocked) return;
  registrar(rap);
  cds.log('mock').info(`mock de _Flight activo en ${REMOTO} (D25)`);
}
