using { ReporteService as src } from './service';

// MCP Nivel 3 / D70: servicio dedicado para agentes de IA, servido SOLO por MCP (@mcp sin @odata).
// Proyecta lo mínimo de ReporteService (sin los totales `virtual` de la cabecera, sin CarrierId_Text).
// Los comentarios /** */ llegan al agente como descripción (tool `describe`): van en lenguaje de negocio.
// Mismo rol que ReporteService (R3 / D53). Lecturas delegadas al RAP en srv/agent-service.ts (R4).
// MCP Nivel 4 / D72: función ocupacionPorConexion (R16), agregada por el RAP con $apply (D43/D47).

/** Consulta de solo lectura del reporte de conexiones aéreas: qué rutas opera cada aerolínea, con sus horarios y distancias, y los vuelos programados de cada ruta con precio y ocupación de asientos. */
@mcp
@mcp.instructions: 'Servicio de solo lectura sobre conexiones aéreas y sus vuelos. Usa describe para ver las entidades y sus campos. Una conexión se identifica por CarrierId + ConnectionId; sus vuelos se filtran por esos mismos dos campos. Para nombres de aeropuertos, ciudades o países consulta Aeropuertos. Cada consulta devuelve como máximo 200 filas (50 si no indicas límite). Responde en español.'
@requires: 'Visualizador'
@readonly
@cds.query.limit: { default: 50, max: 200 }
service ReporteAgentService {

  /** Conexiones: las rutas regulares que opera cada aerolínea, con aeropuerto de salida y de destino, horario y distancia. Usar para preguntas como "qué rutas tiene LH" o "qué conexiones salen de FRA". */
  entity Conexiones  as projection on src.Conexiones {
    /** Código de la aerolínea (2 o 3 letras, p. ej. LH, AA). Junto con ConnectionId identifica la conexión. */
    key CarrierId,
    /** Número de la conexión dentro de la aerolínea (4 dígitos, p. ej. 0400). */
    key ConnectionId,
    /** Nombre de la aerolínea. */
    CarrierName,
    /** Código IATA del aeropuerto de salida (nombre y ciudad en Aeropuertos). */
    AirportFromId,
    /** Código IATA del aeropuerto de destino (nombre y ciudad en Aeropuertos). */
    AirportToId,
    /** Hora local de salida. */
    DepartureTime,
    /** Hora local de llegada. */
    ArrivalTime,
    /** Distancia de la ruta, expresada en la unidad de DistanceUnit. */
    Distance,
    /** Unidad de la distancia: KM (kilómetros) o MI (millas). */
    DistanceUnit,
    /** Vuelos con fecha programados para esta conexión. */
    _Flight : redirected to Vuelos
  };

  /** Vuelos: cada salida con fecha de una conexión, con su precio, el modelo de avión y la ocupación de asientos. Ocupación (%) = SeatsOccupied / SeatsMax. */
  entity Vuelos      as projection on src.Vuelos {
    /** Código de la aerolínea (igual que en Conexiones). */
    key CarrierId,
    /** Número de la conexión (igual que en Conexiones). */
    key ConnectionId,
    /** Fecha del vuelo. */
    key FlightDate,
    /** Precio del pasaje, en la moneda de CurrencyCode. */
    Price,
    /** Moneda del precio (código ISO, p. ej. USD, EUR). */
    CurrencyCode,
    /** Modelo de avión (p. ej. 747-400). */
    PlaneTypeId,
    /** Capacidad total de asientos del vuelo. */
    SeatsMax,
    /** Asientos ocupados (vendidos) del vuelo. */
    SeatsOccupied
  };

  /** Aeropuertos: traduce un código IATA (AirportFromId, AirportToId) a nombre, ciudad y país. */
  entity Aeropuertos as projection on src.Aeropuertos {
    /** Código IATA del aeropuerto (3 letras, p. ej. FRA). */
    key AirportID,
    /** Nombre del aeropuerto. */
    Name,
    /** Ciudad del aeropuerto. */
    City,
    /** Código ISO del país (p. ej. DE). */
    CountryCode,
    /** Nombre del país. */
    CountryCodeText
  };

  /**
   * Ocupación de asientos por conexión: cuántos vuelos tiene cada ruta, cuántos asientos se vendieron, la capacidad
   * total y el % de ocupación. Usar para preguntas como "qué conexión va más llena" o "ocupación de LH".
   * Sin aerolinea devuelve todas las conexiones (como máximo 200), ordenadas por aerolínea y conexión.
   * PorcentajeOcupacion = AsientosOcupados / Capacidad × 100 (1 decimal); vacío (null) si la conexión no tiene vuelos.
   */
  function ocupacionPorConexion(
    /** Código de la aerolínea (2 o 3 letras, p. ej. LH). Opcional: si se omite, se devuelven todas las aerolíneas. */
    // String sin largo (D72): la validación del formato la hace el handler, con mensaje en español para el agente.
    aerolinea : String
  ) returns array of {
    /** Código de la aerolínea (p. ej. LH). */
    CarrierId           : String(3);
    /** Nombre de la aerolínea. */
    CarrierName         : String;
    /** Número de la conexión dentro de la aerolínea (p. ej. 0400). */
    ConnectionId        : String(4);
    /** Ruta en códigos IATA, salida → destino (p. ej. "FRA → JFK"); nombres y ciudades en Aeropuertos. */
    Ruta                : String;
    /** Cantidad de vuelos con fecha programados para la conexión (0 si no tiene). */
    CantidadVuelos      : Integer;
    /** Asientos ocupados (vendidos), sumados sobre todos los vuelos de la conexión. */
    AsientosOcupados    : Integer;
    /** Capacidad de asientos, sumada sobre todos los vuelos de la conexión. */
    Capacidad           : Integer;
    /** % de ocupación = AsientosOcupados / Capacidad × 100, con 1 decimal. Vacío (null) si la conexión no tiene vuelos: no se puede calcular. */
    PorcentajeOcupacion : Decimal(5, 1);
  };
}
