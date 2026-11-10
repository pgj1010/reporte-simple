using { ZMAKS_SB_CONEXIONES as external } from './external/ZMAKS_SB_CONEXIONES';

@requires: 'authenticated-user' // R3
service ReporteService {
  @readonly
  entity Conexiones as projection on external.Conexiones;

  @readonly
  entity Vuelos     as projection on external.Vuelos;
}