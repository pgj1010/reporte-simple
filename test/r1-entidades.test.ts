// R1 — ReporteService expone exactamente dos entidades: Conexiones y Vuelos.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, alice } from './helpers.ts';

const { GET } = iniciar();

describe('R1 — entidades expuestas por ReporteService', () => {
  it('el modelo del servicio tiene exactamente Conexiones y Vuelos', () => {
    const srv = cds.services.ReporteService;
    assert.deepEqual(Object.keys(srv.entities).sort(), ['Conexiones', 'Vuelos']);
  });

  it('el documento de servicio OData publica exactamente Conexiones y Vuelos', async () => {
    const { data } = await GET('/odata/v4/reporte/', alice);
    const nombres = data.value.map((v: { name: string }) => v.name).sort();
    assert.deepEqual(nombres, ['Conexiones', 'Vuelos']);
  });
});
