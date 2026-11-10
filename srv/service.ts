import cds from '@sap/cds';
import { Conexiones, Vuelos } from '#cds-models/ReporteService';

/**
 * D43 — URL relativa al servicio si la lectura trae `$apply` (totales, agregaciones), o undefined.
 * Se usa `req.req` (la petición OData de esta lectura) y no `req.http.req`: dentro de `$batch`,
 * que es como pide Fiori, `req.http.req` es el sobre del batch (`/$batch`), sin el `$apply`.
 */
function urlConApply(req: cds.Request): string | undefined {
  const url = (req as cds.Request & { req?: { url?: string } }).req?.url;
  if (!url) return undefined;
  const consulta = url.indexOf('?');
  if (consulta < 0 || !new URLSearchParams(url.slice(consulta + 1)).has('$apply')) return undefined;
  return url.replace(/^\//, '');
}

export default class ReporteService extends cds.ApplicationService {
  async init() {
    const remote = await cds.connect.to('ZMAKS_SB_CONEXIONES');

    this.on('READ', [Conexiones, Vuelos], req => {
      // D43: CAP no delega `$apply` al servicio remoto (descarta `aggregate` y da 500 con `groupby`).
      // Las lecturas con `$apply` se reenvían tal cual al RAP, que agrega en su base de datos:
      // una petición y unos bytes, sin importar cuántas filas haya. La autorización de CAP
      // (`@requires`) ya se aplicó antes de llegar aquí; un `@restrict` por filas NO se aplicaría
      // a esta URL, por eso test/d43-totales.test.ts falla si se agrega uno.
      const url = urlConApply(req);
      if (url) return remote.send({ method: 'GET', path: url });

      // Todas las demás lecturas se delegan al servicio RAP (R4): CAP no guarda copia de los datos.
      return remote.run(req.query);
    });

    return super.init();
  }
}
