import cds from '@sap/cds';

export default class ReporteService extends cds.ApplicationService {
  async init() {
    const remote = await cds.connect.to('ZMAKS_SB_CONEXIONES');

    // Todas las lecturas se delegan al servicio RAP
    this.on('READ', ['Conexiones', 'Vuelos'], req => remote.run(req.query));

    return super.init();
  }
}