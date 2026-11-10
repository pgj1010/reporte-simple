// R2 — Las tres entidades son de solo lectura: POST, PATCH y DELETE se rechazan.
// Se usa un usuario autenticado para que el rechazo venga de @readonly y no de R3.
// D18: además del 405 se exige el código ENTITY_IS_READ_ONLY, es decir, que el rechazo
// venga del @readonly de CAP y no solo de las restricciones heredadas del RAP
// (@Capabilities.*Restrictions → ENTITY_IS_NOT_CRUD).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, alice, estado, rechazo } from './helpers.ts';

const { GET, POST, PATCH, DELETE } = iniciar();

const entidades: Record<string, { clave: string; nuevo: object; campo?: string }> = {
  Conexiones: {
    clave: "CarrierId='AA',ConnectionId='0017'",
    nuevo: { CarrierId: 'ZZ', ConnectionId: '9999', AirportFromId: 'AAA', AirportToId: 'BBB' },
  },
  Vuelos: {
    clave: "CarrierId='AA',ConnectionId='0017',FlightDate=2026-12-01",
    nuevo: { CarrierId: 'ZZ', ConnectionId: '9999', FlightDate: '2027-01-01' },
  },
  Aeropuertos: {                                        // D50: value help de aeropuertos
    clave: "AirportID='FRA'",
    nuevo: { AirportID: 'ZZZ', Name: 'Nuevo', City: 'Nueva', CountryCode: 'ZZ' },
    campo: 'Name',
  },
};

const solo_lectura = { status: 405, code: 'ENTITY_IS_READ_ONLY' };

describe('R2 — solo lectura', () => {
  for (const [entidad, { clave, nuevo, campo = 'CarrierName' }] of Object.entries(entidades)) {
    const coleccion = `/odata/v4/reporte/${entidad}`;
    const registro = `${coleccion}(${clave})`;

    describe(entidad, () => {
      it('GET del registro existe (control: las rutas de abajo son válidas)', async () => {
        assert.equal(await estado(GET(registro, alice)), 200);
      });

      it('POST se rechaza con 405 por @readonly', async () => {
        assert.deepEqual(await rechazo(POST(coleccion, nuevo, alice)), solo_lectura);
      });

      it('PATCH se rechaza con 405 por @readonly', async () => {
        assert.deepEqual(await rechazo(PATCH(registro, { [campo]: 'cambiado' }, alice)), solo_lectura);
      });

      it('DELETE se rechaza con 405 por @readonly', async () => {
        assert.deepEqual(await rechazo(DELETE(registro, alice)), solo_lectura);
      });

      it('después de los intentos, los datos siguen iguales', async () => {
        const { data } = await GET(`${coleccion}?$count=true&$top=0`, alice);
        assert.equal(data['@odata.count'], 5); // filas de test/data (Conexiones incluye LH 0402, sin vuelos; Aeropuertos, MIA sin conexiones)
        const { data: fila } = await GET(registro, alice);
        assert.notEqual(fila[campo], 'cambiado');
      });
    });
  }
});
