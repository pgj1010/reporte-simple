// R16 / D72 — Función ocupacionPorConexion de ReporteAgentService (MCP Nivel 4), con el mock (CSV de test/data).
// El camino de producción (qué URLs recibe el RAP) está en r16-ocupacion-produccion.test.ts.
import cds from '@sap/cds';
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { iniciar, mcpAgente } from './helpers.ts';

const { axios } = iniciar();
const mcp = (usuario: string | null, metodo: string, params: object = {}) =>
  mcpAgente(axios.defaults.baseURL!, usuario, metodo, params);

/** Llama a la tool de la función como alice; devuelve el resultado MCP completo. */
const llamar = async (args: object = {}) => {
  const { status, mensaje } = await mcp('alice', 'tools/call', { name: 'ocupacionPorConexion', arguments: args });
  assert.equal(status, 200);
  return mensaje.result as { isError?: boolean; content: { text: string }[]; structuredContent?: { result: Record<string, unknown>[] } };
};

/** Resultado de la función (falla si la tool responde error). */
const ocupacion = async (args: object = {}) => {
  const r = await llamar(args);
  assert.ok(!r.isError, JSON.stringify(r));
  return r.structuredContent!.result;
};

/** Campos del resultado, en orden (R16). */
const CAMPOS = ['CarrierId', 'CarrierName', 'ConnectionId', 'Ruta', 'CantidadVuelos', 'AsientosOcupados', 'Capacidad', 'PorcentajeOcupacion'];

/** Esperado con test/data: AA 0017 = 372 + 201 sobre 2 × 385; LH 0402 sin vuelos → 0 / 0 y % null. */
const fila = (CarrierId: string, CarrierName: string, ConnectionId: string, Ruta: string, CantidadVuelos: number,
  AsientosOcupados: number, Capacidad: number, PorcentajeOcupacion: number | null) =>
  ({ CarrierId, CarrierName, ConnectionId, Ruta, CantidadVuelos, AsientosOcupados, Capacidad, PorcentajeOcupacion });
const ESPERADO = [
  fila('AA', 'American Airlines', '0017', 'JFK → SFO', 2, 573, 770, 74.4),
  fila('LH', 'Lufthansa', '0400', 'FRA → JFK', 1, 314, 330, 95.2),
  fila('LH', 'Lufthansa', '0402', 'FRA → JFK', 0, 0, 0, null),
  fila('SQ', 'Singapore Airlines', '0001', 'SFO → SIN', 1, 460, 475, 96.8),
  fila('UA', 'United Airlines', '0058', 'SFO → FRA', 1, 188, 260, 72.3),
];

type Funcion = { kind: string; doc?: string; params: Record<string, { type?: string; length?: number; doc?: string }>;
  returns: { items: { elements: Record<string, { doc?: string }> } } };
const funcion = () => (cds.model!.definitions['ReporteAgentService'] as unknown as { actions: Record<string, Funcion> })
  .actions.ocupacionPorConexion;

describe('R16 — ocupacionPorConexion (función para agentes, D72)', () => {
  describe('modelo', () => {
    it('es una función (solo lectura), no una acción', () => {
      assert.equal(funcion()?.kind, 'function');
    });

    it('un solo parámetro opcional, aerolinea, String sin largo (lo valida el handler, D72)', () => {
      const { params } = funcion();
      assert.deepEqual(Object.keys(params), ['aerolinea']);
      assert.equal(params.aerolinea.type, 'cds.String');
      assert.equal(params.aerolinea.length, undefined);
    });

    it('devuelve los campos de R16, en orden', () => {
      assert.deepEqual(Object.keys(funcion().returns.items.elements), CAMPOS);
    });

    it('la función, el parámetro y cada campo del resultado tienen descripción de negocio (/** */)', () => {
      const f = funcion();
      const sinDoc = [
        ...(f.doc?.trim() ? [] : ['ocupacionPorConexion']),
        ...(f.params.aerolinea.doc?.trim() ? [] : ['aerolinea']),
        ...CAMPOS.filter(c => !f.returns.items.elements[c].doc?.trim()),
      ];
      assert.deepEqual(sinDoc, []);
    });

    it('la descripción de la función explica el % null sin vuelos (describe no muestra la de los campos, D72)', () => {
      assert.match(funcion().doc!, /null\) si la conexión no tiene vuelos/);
    });
  });

  describe('tool MCP (per_action_tool, D72)', () => {
    it('es una tool propia, de solo lectura, con la descripción de la función y el parámetro', async () => {
      const { mensaje } = await mcp('alice', 'tools/list');
      const tool = mensaje.result.tools.find((t: { name: string }) => t.name === 'ocupacionPorConexion');
      assert.ok(tool, 'la tool ocupacionPorConexion no aparece en tools/list');
      assert.equal(tool.annotations.readOnlyHint, true);
      assert.equal(tool.annotations.destructiveHint, false);
      assert.match(tool.description, /^Ocupación de asientos por conexión/);
      assert.deepEqual(Object.keys(tool.inputSchema.properties), ['aerolinea']);
      assert.deepEqual(tool.inputSchema.required ?? [], []);
    });

    it('no existe la tool genérica call (marcada destructiva)', async () => {
      const { mensaje } = await mcp('alice', 'tools/list');
      assert.ok(!mensaje.result.tools.some((t: { name: string }) => t.name === 'call'));
    });
  });

  describe('autorización: rol Visualizador (R3, R15)', () => {
    const params = { name: 'ocupacionPorConexion', arguments: {} };
    it('sin usuario → 401', async () => {
      assert.equal((await mcp(null, 'tools/call', params)).status, 401);
    });
    it('usuario sin el rol (sinrol) → 403', async () => {
      assert.equal((await mcp('sinrol', 'tools/call', params)).status, 403);
    });
    it('alice (Visualizador) → 200 con datos', async () => {
      assert.equal((await ocupacion()).length, ESPERADO.length);
    });
  });

  describe('resultados con los datos del mock', () => {
    it('sin aerolinea: todas las conexiones, ordenadas, con sumas, vuelos y % del CSV', async () => {
      assert.deepEqual(await ocupacion(), ESPERADO);
    });

    it('aerolinea LH: solo sus conexiones; 0402 sin vuelos → 0 / 0 y % null', async () => {
      assert.deepEqual(await ocupacion({ aerolinea: 'LH' }), ESPERADO.filter(f => f.CarrierId === 'LH'));
    });

    it('aerolinea sin conexiones (ZZ) → lista vacía', async () => {
      assert.deepEqual(await ocupacion({ aerolinea: 'ZZ' }), []);
    });

    it('el resultado de la tool también llega como texto para el agente', async () => {
      const { content } = await llamar({ aerolinea: 'AA' });
      assert.match(content[0].text, /AA,American Airlines,"0017",JFK → SFO,2,573,770,74\.4/);
    });
  });

  describe('validación de aerolinea (D72: antes de armar la URL $apply)', () => {
    let lecturasRemotas: string[] = [];
    before(async () => {
      const remoto = await cds.connect.to('ZMAKS_SB_CONEXIONES');
      remoto.prepend(() => remoto.before('READ', '*', req => { lecturasRemotas.push(req.target?.name ?? '?'); }));
    });

    for (const valor of ['lh', "LH' or 1 eq 1", 'LHXX', 'L']) {
      it(`"${valor}" → error en español y ninguna lectura al RAP`, async () => {
        lecturasRemotas = [];
        const r = await llamar({ aerolinea: valor });
        assert.equal(r.isError, true, JSON.stringify(r));
        assert.match(r.content[0].text, /El código de aerolínea .* no es válido: use 2 o 3 letras o dígitos en mayúsculas/);
        assert.deepEqual(lecturasRemotas, []);
      });
    }

    it('400 en una llamada directa al servicio', async () => {
      const srv = await cds.connect.to('ReporteAgentService');
      const alice = new cds.User({ id: 'alice', roles: ['Visualizador'], attr: {} });
      await assert.rejects(srv.tx({ user: alice }, tx => tx.send('ocupacionPorConexion', { aerolinea: 'lh' })),
        (e: { code?: unknown; status?: unknown }) => e.code === 400 || e.status === 400);
    });
  });
});
