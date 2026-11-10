using { ZMAKS_SB_CONEXIONES as external } from './external/ZMAKS_SB_CONEXIONES';

@requires: 'authenticated-user' // R3
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
}

// R12 / D31: el RAP publica Price con Scale="variable" (los decimales dependen de la moneda), pero
// `cds import` lo deja como Decimal(precision: 16), es decir escala 0, y Fiori mostraría 423 USD en vez
// de 422.94 USD. Se corrige solo el $metadata publicado (no cambia lo que se pide al RAP) y sin editar
// srv/external. @odata.Scale solo tiene efecto junto con @odata.Type.
annotate ReporteService.Vuelos with {
  Price @odata.Type: 'Edm.Decimal' @odata.Precision: 16 @odata.Scale: 'variable';
}