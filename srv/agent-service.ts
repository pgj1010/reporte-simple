import cds from '@sap/cds';
import { Conexiones, Vuelos, Aeropuertos } from '#cds-models/ReporteAgentService';

/**
 * MCP Nivel 3 / D70 — servicio para agentes. Sus entidades proyectan sobre las de ReporteService, pero CAP
 * no pasa por los handlers de ReporteService: cada lectura se delega aquí al servicio remoto (R4), que
 * resuelve la cadena de proyecciones hasta la entidad del RAP. Sin `$apply` ni totales: el agente usa la tool
 * `query` (CQN, nunca URL OData) y este servicio no expone los campos `virtual` de la cabecera.
 */
export default class ReporteAgentService extends cds.ApplicationService {
  async init() {
    const remote = await cds.connect.to('ZMAKS_SB_CONEXIONES');
    const f4 = await cds.connect.to('I_AIRPORT_STDVH');
    this.on('READ', [Conexiones, Vuelos], req => remote.run(req.query));
    this.on('READ', Aeropuertos, req => f4.run(req.query));
    return super.init();
  }
}
