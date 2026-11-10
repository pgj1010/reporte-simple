// R6 — Conexiones se identifica por CarrierId + ConnectionId;
// Vuelos por CarrierId + ConnectionId + FlightDate.
import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, alice } from './helpers.ts';

const { GET } = iniciar();

/** Claves de la entidad en el modelo, sin asociaciones. */
const claves = (entidad: string) => {
  const { keys } = cds.services.ReporteService.entities[entidad];
  return Object.keys(keys).filter(k => !(keys[k] as { isAssociation?: boolean }).isAssociation);
};

describe('R6 — claves de las entidades', () => {
  it('Conexiones: CarrierId + ConnectionId', () => {
    assert.deepEqual(claves('Conexiones'), ['CarrierId', 'ConnectionId']);
  });

  it('Vuelos: CarrierId + ConnectionId + FlightDate', () => {
    assert.deepEqual(claves('Vuelos'), ['CarrierId', 'ConnectionId', 'FlightDate']);
  });

  it('lectura de una Conexión por su clave completa', async () => {
    const { data } = await GET("/odata/v4/reporte/Conexiones(CarrierId='LH',ConnectionId='0400')", alice);
    assert.equal(data.CarrierId, 'LH');
    assert.equal(data.ConnectionId, '0400');
    assert.equal(data.AirportFromId, 'FRA');
  });

  it('lectura de un Vuelo por su clave completa', async () => {
    const { data } = await GET(
      "/odata/v4/reporte/Vuelos(CarrierId='AA',ConnectionId='0017',FlightDate=2026-12-15)", alice);
    assert.deepEqual([data.CarrierId, data.ConnectionId, data.FlightDate], ['AA', '0017', '2026-12-15']);
    assert.equal(data.SeatsOccupied, 201);
  });
});
