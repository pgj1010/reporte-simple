import cds from '@sap/cds';
import { Conexiones, Vuelos } from '#cds-models/ReporteService';

export default class ReporteService extends cds.ApplicationService {
  async init() {
    const remote = await cds.connect.to('ZMAKS_SB_CONEXIONES');

    // Todas las lecturas se delegan al servicio RAP (R4): CAP no guarda copia de los datos.
    this.on('READ', [Conexiones, Vuelos], req => remote.run(req.query));

    return super.init();
  }
}
