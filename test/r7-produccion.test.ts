// R7 / D26 — Camino de producción de `_Flight`: CAP delega la navegación al RAP tal cual
// (`/_Flight` y `$expand=_Flight`, con ese nombre y en una sola petición) y el RAP la resuelve
// con su propia asociación. Si alguien "arregla" R7 en `srv/` con una asociación propia
// (p. ej. `_FlightCAP as _Flight`), CAP pediría al RAP una navegación que no existe y este test falla.
//
// Corre en un PROCESO APARTE con el perfil `production` (NODE_ENV=production) y el servicio remoto
// apuntando, con CDS_CONFIG, a un servidor local que registra lo que recibe. También verifica que
// en producción el mock de D25 (`test/mocked.js`) no se activa, aunque se pase `--with-mocks`.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { cdsCli, raiz } from './helpers.ts';

const RUTA_RAP = '/rap';
const recibidas: string[] = [];
let rap: http.Server;
let cap: ChildProcess;
let salida = '';
let base = '';

/** RAP simulado: registra cada petición y responde vacío (aquí solo importa lo que recibe). */
function iniciarRap(): Promise<number> {
  rap = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url!.slice(RUTA_RAP.length));
    recibidas.push(url);
    res.setHeader('content-type', 'application/json');
    const unaConexion = /^\/Conexiones\([^)]*\)(\?|$)/.test(url);
    res.end(JSON.stringify(unaConexion ? { CarrierId: 'AA', ConnectionId: '0017', _Flight: [] } : { value: [] }));
  });
  return new Promise(ok => rap.listen(0, () => ok((rap.address() as AddressInfo).port)));
}

/** Levanta CAP con el perfil production en otro proceso y espera la URL en la que escucha. */
function iniciarCap(puertoRap: number): Promise<string> {
  const config = {
    requires: {
      auth: { kind: 'mocked' },                              // usuario alice sin XSUAA
      db: { kind: 'sqlite', credentials: { url: ':memory:' } },
      ZMAKS_SB_CONEXIONES: {                                 // en lugar de la destination S4_BACKEND
        credentials: { url: `http://localhost:${puertoRap}${RUTA_RAP}`, destination: null, path: null },
      },
    },
  };
  cap = spawn('cds', ['serve', 'all', '--with-mocks', '--in-memory', '--port', '0'], {
    cwd: raiz,
    env: {
      ...process.env, NODE_ENV: 'production', CDS_TYPESCRIPT: 'false',
      CDS_PLUGIN_UI5_ACTIVE: 'false', CDS_CONFIG: JSON.stringify(config),
    },
  });
  return new Promise((ok, falla) => {
    const leer = (d: Buffer) => {
      salida += d;
      const m = salida.match(/server listening on \{ url: '([^']+)'/);
      if (m) ok(m[1]);
    };
    cap.stdout!.on('data', leer);
    cap.stderr!.on('data', leer);
    cap.on('exit', c => falla(new Error(`cds serve terminó (${c}):\n${salida}`)));
    setTimeout(() => falla(new Error(`cds serve no arrancó en 60 s:\n${salida}`)), 60_000).unref();
  });
}

/** GET autenticado como alice; devuelve lo que recibió el RAP durante esa petición. */
async function alRap(ruta: string): Promise<string[]> {
  recibidas.length = 0;
  await fetch(base + '/odata/v4/reporte/' + ruta, { headers: { authorization: 'Basic ' + btoa('alice:') } });
  return [...recibidas];
}

describe('R7 / D26 — producción: _Flight se delega al RAP', () => {
  before(async () => { base = await iniciarCap(await iniciarRap()); });
  after(() => { cap?.kill(); rap?.close(); });

  it('Conexiones(...)/_Flight llega al RAP como /_Flight, en una sola petición', async () => {
    const r = await alRap("Conexiones(CarrierId='AA',ConnectionId='0017')/_Flight");
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\(CarrierId='AA',ConnectionId='0017'\)\/_Flight(\?|$)/);
  });

  it('$expand=_Flight llega al RAP como $expand=_Flight, en una sola petición', async () => {
    const r = await alRap('Conexiones?$expand=_Flight($select=FlightDate)');
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\?.*\$expand=_Flight\(/); 
  });

  it('el detalle de una conexión pide sus vuelos con $expand=_Flight en una sola petición', async () => {
    const r = await alRap("Conexiones(CarrierId='AA',ConnectionId='0017')?$expand=_Flight");
    assert.equal(r.length, 1, `peticiones al RAP: ${JSON.stringify(r)}`);
    assert.match(r[0], /^\/Conexiones\(CarrierId='AA',ConnectionId='0017'\)\?.*\$expand=_Flight(?!\w)/);
  });

  describe('el mock de D25 no se activa en producción', () => {
    it('features.test_mocks es false con NODE_ENV=production', async () => {
      const { stdout } = await cdsCli(['env', 'get', 'features.test_mocks'], { NODE_ENV: 'production' });
      assert.equal(stdout.trim(), 'false');
    });

    it('CAP no carga test/mocked.js ni el mock de _Flight (aun con --with-mocks)', () => {
      assert.doesNotMatch(salida, /adding mock behaviours|mock de _Flight activo/);
    });

    it('el servicio remoto no se simula: se conecta al RAP', () => {
      assert.doesNotMatch(salida, /mocking ZMAKS_SB_CONEXIONES/);
    });
  });
});
