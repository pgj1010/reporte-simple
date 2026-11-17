// R15 / D70 — Servicio para agentes ReporteAgentService: solo por MCP, solo lectura, rol Visualizador,
// entidades y campos fijos con descripción de negocio, límite de filas y delegación al RAP (R4).
// Con el mock (CSV de test/data); el camino de producción está en r15-agente-produccion.test.ts.
import cds from '@sap/cds';
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, alice, estado, mcpAgente } from './helpers.ts';

const test = iniciar();
const { GET, axios } = test;

/** Campos que ve el agente, por entidad (D70). */
export const CAMPOS_AGENTE: Record<string, string[]> = {
  Conexiones: ['CarrierId', 'ConnectionId', 'CarrierName', 'AirportFromId', 'AirportToId',
    'DepartureTime', 'ArrivalTime', 'Distance', 'DistanceUnit', '_Flight'],
  Vuelos: ['CarrierId', 'ConnectionId', 'FlightDate', 'Price', 'CurrencyCode', 'PlaneTypeId', 'SeatsMax', 'SeatsOccupied'],
  Aeropuertos: ['AirportID', 'Name', 'City', 'CountryCode', 'CountryCodeText'],
};

/** Llamada MCP a /mcp/reporte-agent; `usuario` null = sin credenciales. */
const mcp = (usuario: string | null, metodo: string, params: object = {}) =>
  mcpAgente(axios.defaults.baseURL!, usuario, metodo, params);

/** Ejecuta la tool `query` como alice y devuelve las filas (falla si la tool responde error). */
async function consultar(cql: string): Promise<Record<string, unknown>[]> {
  const { status, mensaje } = await mcp('alice', 'tools/call', { name: 'query', arguments: { cql } });
  assert.equal(status, 200);
  assert.ok(!mensaje.result?.isError, JSON.stringify(mensaje));
  return mensaje.result.structuredContent.data;
}

const definicion = () => cds.model!.definitions['ReporteAgentService'] as unknown as Record<string, unknown>;
const entidad = (n: string) => cds.model!.definitions[`ReporteAgentService.${n}`] as cds.entity & { doc?: string };

describe('R15 — ReporteAgentService (servicio para agentes, D70)', () => {
  describe('modelo: entidades, campos y descripciones', () => {
    it('expone exactamente Conexiones, Vuelos y Aeropuertos', () => {
      const entidades = Object.keys(cds.model!.definitions)
        .filter(n => n.startsWith('ReporteAgentService.') && cds.model!.definitions[n].kind === 'entity')
        .map(n => n.slice('ReporteAgentService.'.length)).sort();
      assert.deepEqual(entidades, Object.keys(CAMPOS_AGENTE).sort());
    });

    for (const [nombre, campos] of Object.entries(CAMPOS_AGENTE)) {
      it(`${nombre}: solo los campos de D70 (sin totales virtual ni textos repetidos)`, () => {
        assert.deepEqual(Object.keys(entidad(nombre).elements), campos);
      });

      it(`${nombre}: la entidad y cada campo tienen descripción de negocio (/** */)`, () => {
        const sinDoc = [nombre, ...campos.map(c => `${nombre}.${c}`)].filter(n => {
          const [e, c] = n.split('.');
          return !(c ? (entidad(e).elements[c] as { doc?: string }).doc : entidad(e).doc)?.trim();
        });
        assert.deepEqual(sinDoc, []);
      });
    }

    it('_Flight de Conexiones apunta a los Vuelos del mismo servicio', () => {
      assert.equal((entidad('Conexiones').elements._Flight as unknown as { target: string }).target, 'ReporteAgentService.Vuelos');
    });

    it('el servicio tiene descripción, instrucciones para el agente, rol Visualizador y límite 50/200', () => {
      const s = definicion();
      assert.ok((s.doc as string)?.trim());
      assert.match(s['@mcp.instructions'] as string, /solo lectura/);
      assert.equal(s['@requires'], 'Visualizador');
      assert.equal(s['@readonly'], true);
      assert.equal(s['@cds.query.limit.default'], 50);
      assert.equal(s['@cds.query.limit.max'], 200);
    });
  });

  describe('protocolos: solo MCP', () => {
    it('ReporteAgentService se sirve solo en /mcp/reporte-agent', () => {
      assert.deepEqual((cds.services.ReporteAgentService as unknown as { endpoints: unknown[] }).endpoints,
        [{ kind: 'mcp', path: '/mcp/reporte-agent' }]);
    });

    it('no tiene ruta OData', async () => {
      assert.equal(await estado(GET('/odata/v4/reporte-agent/Conexiones', alice)), 404);
    });

    it('ReporteService ya no se sirve por MCP (solo OData, D70 reemplaza a D69)', () => {
      assert.deepEqual((cds.services.ReporteService as unknown as { endpoints: unknown[] }).endpoints,
        [{ kind: 'odata', path: '/odata/v4/reporte' }]);
    });

    it('el agente solo tiene tools de lectura: describe, query y la función de R16 (D72: per_action_tool)', async () => {
      const { mensaje } = await mcp('alice', 'tools/list');
      const tools: { name: string; annotations?: { readOnlyHint?: boolean } }[] = mensaje.result.tools;
      assert.deepEqual(tools.map(t => t.name).sort(), ['describe', 'ocupacionPorConexion', 'query']);
      assert.deepEqual(tools.filter(t => !t.annotations?.readOnlyHint).map(t => t.name), []);
    });
  });

  describe('autorización: rol Visualizador (R3)', () => {
    for (const [metodo, params] of [
      ['tools/list', {}],
      ['tools/call', { name: 'query', arguments: { cql: 'SELECT CarrierId from Conexiones' } }],
    ] as const) {
      it(`${metodo}: sin usuario → 401`, async () => {
        assert.equal((await mcp(null, metodo, params)).status, 401);
      });

      it(`${metodo}: usuario sin el rol (sinrol) → 403`, async () => {
        assert.equal((await mcp('sinrol', metodo, params)).status, 403);
      });

      it(`${metodo}: alice (Visualizador) → 200`, async () => {
        const { status, mensaje } = await mcp('alice', metodo, params);
        assert.equal(status, 200);
        assert.ok(mensaje.result && !mensaje.result.isError, JSON.stringify(mensaje));
      });
    }
  });

  describe('solo lectura (R2)', () => {
    const visualizador = new cds.User({ id: 'alice', roles: ['Visualizador'], attr: {} });
    const escrituras = {
      INSERT: (e: string) => INSERT.into(e).entries({ CarrierId: 'ZZ', ConnectionId: '9999' }),
      UPDATE: (e: string) => UPDATE(e).set({ CarrierId: 'ZZ' }).where({ CarrierId: 'AA' }),
      DELETE: (e: string) => DELETE.from(e).where({ CarrierId: 'AA' }),
    };
    for (const [operacion, sentencia] of Object.entries(escrituras)) {
      it(`${operacion} en Conexiones y Vuelos se rechaza con 405 por @readonly`, async () => {
        const srv = await cds.connect.to('ReporteAgentService');
        for (const e of ['ReporteAgentService.Conexiones', 'ReporteAgentService.Vuelos']) {
          await assert.rejects(srv.tx({ user: visualizador }, tx => tx.run(sentencia(e))),
            // En llamadas internas (sin OData) CAP deja la clave en `message` y el código HTTP en `code`.
            (err: { code?: unknown; message?: string }) => err.message === 'ENTITY_IS_READ_ONLY' && err.code === 405,
            `${operacion} ${e}`);
        }
      });
    }
  });

  describe('lecturas: datos del mock vía la tool query, delegadas al RAP (R4)', () => {
    let lecturasRemotas: string[] = [];
    before(async () => {
      for (const nombre of ['ZMAKS_SB_CONEXIONES', 'I_AIRPORT_STDVH']) {
        const remoto = await cds.connect.to(nombre);
        remoto.prepend(() => remoto.before('READ', '*', req => { lecturasRemotas.push(req.target?.name ?? '?'); }));
      }
    });

    it('describe entrega al agente las descripciones de negocio', async () => {
      const { mensaje } = await mcp('alice', 'tools/call', { name: 'describe', arguments: {} });
      const texto = mensaje.result.content[0].text as string;
      assert.match(texto, /Consulta de solo lectura del reporte de conexiones aéreas/);
      assert.match(texto, /Ocupación \(%\) = SeatsOccupied \/ SeatsMax/);
    });

    it('Conexiones de LH: las del CSV, leídas del remoto', async () => {
      lecturasRemotas = [];
      const filas = await consultar("SELECT CarrierId, ConnectionId, AirportFromId from Conexiones where CarrierId = 'LH'");
      assert.deepEqual(filas, [
        { CarrierId: 'LH', ConnectionId: '0400', AirportFromId: 'FRA' },
        { CarrierId: 'LH', ConnectionId: '0402', AirportFromId: 'FRA' },
      ]);
      assert.deepEqual(lecturasRemotas, ['ZMAKS_SB_CONEXIONES.Conexiones']);
    });

    it('vuelos de una conexión por _Flight', async () => {
      const filas = await consultar("SELECT FlightDate, SeatsOccupied, SeatsMax from Conexiones[CarrierId = 'AA' and ConnectionId = '0017']:_Flight");
      assert.deepEqual(filas, [
        { FlightDate: '2026-12-01', SeatsOccupied: 372, SeatsMax: 385 },
        { FlightDate: '2026-12-15', SeatsOccupied: 201, SeatsMax: 385 },
      ]);
    });

    it('Aeropuertos: leídos del F4 remoto (D50)', async () => {
      lecturasRemotas = [];
      const filas = await consultar("SELECT AirportID, City from Aeropuertos where AirportID = 'FRA'");
      assert.deepEqual(filas, [{ AirportID: 'FRA', City: 'Frankfurt/Main' }]);
      assert.deepEqual(lecturasRemotas, ['I_AIRPORT_STDVH.xDMOxI_Airport_StdVH']);
    });

    it('SELECT * de Vuelos trae solo los campos de D70', async () => {
      const [fila] = await consultar('SELECT * from Vuelos limit 1');
      assert.deepEqual(Object.keys(fila).sort(), [...CAMPOS_AGENTE.Vuelos].sort());
    });
  });
});
