import cds from '@sap/cds';
import { Conexiones, Vuelos, Aeropuertos, ocupacionPorConexion } from '#cds-models/ReporteAgentService';
import { literal } from './service.ts';

type Fila = Record<string, unknown>;
type Conexion = Record<'CarrierId' | 'ConnectionId' | 'CarrierName' | 'AirportFromId' | 'AirportToId', string>;

/** R16 / D72: formato aceptado para `aerolinea` (se valida antes de armar la URL `$apply` del RAP). */
const AEROLINEA = /^[A-Z0-9]{2,3}$/;

/** R16: como máximo 200 conexiones, el mismo límite de las consultas del servicio (D70). */
export const MAX_CONEXIONES = 200;

/**
 * R16 / D72 — URLs `$apply` que se mandan al RAP (sin alias, D43/D47; el Gateway no acepta `$count` en `$apply`):
 * `sumas` agrega asientos por conexión y `vuelos` devuelve una fila (solo claves) por vuelo, para contarlos.
 */
export function urlsDeOcupacion(aerolinea?: string | null) {
  const filtro = aerolinea ? `filter(CarrierId eq ${literal(aerolinea)})/` : '';
  const url = (transformacion: string) => `Vuelos?$apply=${encodeURIComponent(filtro + transformacion)}`;
  return {
    sumas: url('groupby((CarrierId,ConnectionId),aggregate(SeatsOccupied,SeatsMax))'),
    vuelos: url('groupby((CarrierId,ConnectionId,FlightDate))'),
  };
}

/** Respuesta de `remote.send` como lista: el RAP real devuelve `{ value: [...] }`, el mock la lista. */
const filas = (r: unknown): Fila[] => ([] as Fila[]).concat((r as { value?: Fila[] })?.value ?? (r as Fila[]) ?? []);
const clave = (f: Fila) => `${f.CarrierId}\u0000${f.ConnectionId}`;

/**
 * MCP Nivel 3 / D70 — servicio para agentes. Sus entidades proyectan sobre las de ReporteService, pero CAP
 * no pasa por los handlers de ReporteService: cada lectura se delega aquí al servicio remoto (R4), que
 * resuelve la cadena de proyecciones hasta la entidad del RAP. Sin `$apply` ni totales: el agente usa la tool
 * `query` (CQN, nunca URL OData) y este servicio no expone los campos `virtual` de la cabecera.
 * MCP Nivel 4 / D72 — la ocupación por conexión es una función (R16) que agrega en el RAP.
 */
export default class ReporteAgentService extends cds.ApplicationService {
  async init() {
    const remote = await cds.connect.to('ZMAKS_SB_CONEXIONES');
    const f4 = await cds.connect.to('I_AIRPORT_STDVH');
    this.on('READ', [Conexiones, Vuelos], req => remote.run(req.query));
    this.on('READ', Aeropuertos, req => f4.run(req.query));

    this.on(ocupacionPorConexion, async req => {
      const aerolinea = req.data.aerolinea || null;
      if (aerolinea && !AEROLINEA.test(aerolinea))
        return req.reject(400, `El código de aerolínea "${aerolinea}" no es válido: use 2 o 3 letras o dígitos en mayúsculas (p. ej. LH).`);

      // Conexiones (nombre y ruta) por la delegación normal (R4). No con un `groupBy` en CQN: CAP no delega
      // `aggregate` al remoto y en el mock la proyección pierde los alias (D43). Las sumas las hace el RAP.
      const conexiones: Conexion[] = await remote.run(
        SELECT.from('ZMAKS_SB_CONEXIONES.Conexiones')
          .columns('CarrierId', 'ConnectionId', 'CarrierName', 'AirportFromId', 'AirportToId')
          .where(aerolinea ? { CarrierId: aerolinea } : {})
          .orderBy('CarrierId', 'ConnectionId')
          .limit(MAX_CONEXIONES));
      if (!conexiones.length) return [];

      const urls = urlsDeOcupacion(aerolinea);
      const [sumas, vuelos] = await Promise.all([
        remote.send({ method: 'GET', path: urls.sumas }),
        remote.send({ method: 'GET', path: urls.vuelos }),
      ]);
      const sumaPorConexion = new Map(filas(sumas).map(s => [clave(s), s]));
      const vuelosPorConexion = new Map<string, number>();
      for (const v of filas(vuelos)) vuelosPorConexion.set(clave(v), (vuelosPorConexion.get(clave(v)) ?? 0) + 1);

      return conexiones.map(c => {
        const suma = sumaPorConexion.get(clave(c));
        const ocupados = Number(suma?.SeatsOccupied ?? 0);
        const capacidad = Number(suma?.SeatsMax ?? 0);
        return {
          CarrierId: c.CarrierId,
          CarrierName: c.CarrierName,
          ConnectionId: c.ConnectionId,
          Ruta: `${c.AirportFromId} → ${c.AirportToId}`,
          CantidadVuelos: vuelosPorConexion.get(clave(c)) ?? 0,
          AsientosOcupados: ocupados,
          Capacidad: capacidad,
          // Sin vuelos (capacidad 0) el % no se puede calcular: null (decisión del usuario, D72).
          PorcentajeOcupacion: capacidad ? Math.round((ocupados / capacidad) * 1000) / 10 : null,
        };
      });
    });

    return super.init();
  }
}
