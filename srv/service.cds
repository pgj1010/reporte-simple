using { ZMAKS_SB_CONEXIONES as external } from './external/ZMAKS_SB_CONEXIONES';
using { I_AIRPORT_STDVH as f4 } from './external/I_AIRPORT_STDVH';

@requires: 'Visualizador' // R3 / D53: rol de xs-security.json
service ReporteService {
  @readonly
  entity Conexiones as projection on external.Conexiones {
    *,
    // R14 / D47: totales de los vuelos de la conexión para la cabecera del detalle. El RAP no los
    // tiene: srv/service.ts los quita de la consulta delegada y los calcula con una sola petición
    // groupby/aggregate al RAP.
    virtual null as TotalAsientosOcupados : Integer,
    virtual null as TotalCapacidad        : Integer
  };

  @readonly
  entity Vuelos     as projection on external.Vuelos;

  // D50: value help de aeropuertos (AirportFromId / AirportToId), el mismo F4 que usa el RAP
  // (/dmo/i_airport_stdvh). Sin I_CountryVH: el diálogo de aeropuertos no necesita su propio F4 de país.
  @readonly
  entity Aeropuertos as projection on f4.xDMOxI_Airport_StdVH {
    AirportID, Name, City, CountryCode, CountryCodeText
  };
}

// R12 / D31: el RAP publica Price con Scale="variable" (los decimales dependen de la moneda), pero
// `cds import` lo deja como Decimal(precision: 16), es decir escala 0, y Fiori mostraría 423 USD en vez
// de 422.94 USD. Se corrige solo el $metadata publicado (no cambia lo que se pide al RAP) y sin editar
// srv/external. @odata.Scale solo tiene efecto junto con @odata.Type.
annotate ReporteService.Vuelos with {
  Price @odata.Type: 'Edm.Decimal' @odata.Precision: 16 @odata.Scale: 'variable';
}