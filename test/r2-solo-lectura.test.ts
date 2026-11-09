// R2 — Ambas entidades son de solo lectura: POST, PATCH y DELETE se rechazan.
// Se usa un usuario autenticado para que el rechazo venga de @readonly y no de R3.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, alice, estado } from './helpers.ts';

const { GET, POST, PATCH, DELETE } = iniciar();

const entidades = {
  Conexiones: {
    clave: "CarrierId='AA',ConnectionId='0017'",
    nuevo: { CarrierId: 'ZZ', ConnectionId: '9999', AirportFromId: 'AAA', AirportToId: 'BBB' },
  },
  Vuelos: {
    clave: "CarrierId='AA',ConnectionId='0017',FlightDate=2026-12-01",
    nuevo: { CarrierId: 'ZZ', ConnectionId: '9999', FlightDate: '2027-01-01' },
  },
};

describe('R2 — solo lectura', () => {
  for (const [entidad, { clave, nuevo }] of Object.entries(entidades)) {
    const coleccion = `/odata/v4/reporte/${entidad}`;
    const registro = `${coleccion}(${clave})`;

    describe(entidad, () => {
      it('GET del registro existe (control: las rutas de abajo son válidas)', async () => {
        assert.equal(await estado(GET(registro, alice)), 200);
      });

      it('POST se rechaza con 405', async () => {
        assert.equal(await estado(POST(coleccion, nuevo, alice)), 405);
      });

      it('PATCH se rechaza con 405', async () => {
        assert.equal(await estado(PATCH(registro, { CarrierName: 'cambiado' }, alice)), 405);
      });

      it('DELETE se rechaza con 405', async () => {
        assert.equal(await estado(DELETE(registro, alice)), 405);
      });

      it('después de los intentos, los datos siguen iguales', async () => {
        const { data } = await GET(`${coleccion}?$count=true&$top=0`, alice);
        assert.equal(data['@odata.count'], entidad === 'Conexiones' ? 4 : 5);
        const { data: fila } = await GET(registro, alice);
        assert.notEqual(fila.CarrierName, 'cambiado');
      });
    });
  }
});
