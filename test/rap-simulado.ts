// RAP simulado + CAP en perfil production, en un PROCESO APARTE (D26). No es un archivo de test.
// Sirve para probar el camino de producción sin el S/4: CAP apunta (con CDS_CONFIG) a un servidor
// local que registra cada petición que recibe y responde lo que diga `responder`.
// Reutilizable para otros reportes (plantilla, Etapa 7).
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { raiz } from './helpers.ts';

const RUTA_RAP = '/rap';
/** F4 de aeropuertos (D50): mismo servidor, con la ruta de producción tal cual (D51, `;ps=…;va=…`). */
const RUTA_F4 = '/f4' + JSON.parse(readFileSync(`${raiz}/package.json`, 'utf8'))
  .cds.requires.I_AIRPORT_STDVH['[production]'].credentials.path;

/** Respuesta del RAP simulado para una URL (relativa a la raíz del servicio, ya decodificada; las del F4
 *  de aeropuertos empiezan con `/f4/sap/opu/odata4/...`, la ruta completa).
 *  Si el objeto trae `__status`, se responde con ese código HTTP (p. ej. 501 como el Gateway). */
export type Responder = (url: string) => unknown;

export interface Entorno {
  /** URLs que recibió el RAP desde la última llamada a `pedir` (o desde el arranque). */
  recibidas: string[];
  /** Bytes que respondió el RAP desde la última llamada a `pedir`. */
  bytes: () => number;
  /** Salida de `cds serve` (para comprobar, p. ej., que el mock no se cargó). */
  salida: () => string;
  /** GET autenticado como alice a `/odata/v4/reporte/<ruta>`; vacía antes `recibidas`. */
  pedir: (ruta: string, init?: RequestInit) => Promise<Response>;
  /** POST `$batch` con una sola sub-petición GET; vacía antes `recibidas`. */
  pedirEnBatch: (ruta: string) => Promise<string>;
  /** Llamada MCP (JSON-RPC) a `/mcp/<ruta>` como alice, p. ej. `tools/call` con la tool `query` (D70); vacía antes
   *  `recibidas`. Devuelve el código HTTP y el `result` (o `error`) del mensaje JSON-RPC, también si llega por SSE. */
  pedirMcp: (ruta: string, metodo: string, params?: object) => Promise<{ status: number; mensaje: any }>;
  cerrar: () => void;
}

/** Respuesta por defecto: vacía, o una conexión si se pide una sola. */
export const respuestaVacia: Responder = url =>
  /^\/Conexiones\([^)]*\)(\?|$)/.test(url) ? { CarrierId: 'AA', ConnectionId: '0017', _Flight: [] } : { value: [] };

export async function iniciar(responder: Responder = respuestaVacia): Promise<Entorno> {
  const recibidas: string[] = [];
  let bytes = 0;
  const rap = http.createServer((req, res) => {
    const cruda = decodeURIComponent(req.url!);
    const url = cruda.startsWith(RUTA_RAP + '/') ? cruda.slice(RUTA_RAP.length) : cruda;
    recibidas.push(url);
    const { __status, ...respuesta } = responder(url) as { __status?: number };
    const cuerpo = JSON.stringify(respuesta);
    bytes += cuerpo.length;
    if (__status) res.statusCode = __status;
    res.setHeader('content-type', 'application/json');
    res.end(cuerpo);
  });
  const puerto = await new Promise<number>(ok => rap.listen(0, () => ok((rap.address() as AddressInfo).port)));

  const config = {
    requires: {
      auth: { kind: 'mocked', users: { alice: { roles: ['Visualizador'] } } }, // alice con el rol de R3 (D53), sin XSUAA
      db: { kind: 'sqlite', credentials: { url: ':memory:' } },
      ZMAKS_SB_CONEXIONES: {                                 // en lugar de la destination S4_BACKEND
        credentials: { url: `http://localhost:${puerto}${RUTA_RAP}`, destination: null, path: null },
      },
      I_AIRPORT_STDVH: {
        credentials: { url: `http://localhost:${puerto}${RUTA_F4}`, destination: null, path: null },
      },
    },
  };
  // `--with-mocks` a propósito: en producción el mock de D25 no debe cargarse aunque se pida.
  const cap: ChildProcess = spawn('cds', ['serve', 'all', '--with-mocks', '--in-memory', '--port', '0'], {
    cwd: raiz,
    env: {
      ...process.env, NODE_ENV: 'production', CDS_TYPESCRIPT: 'false',
      CDS_PLUGIN_UI5_ACTIVE: 'false', CDS_CONFIG: JSON.stringify(config),
    },
  });
  let salida = '';
  const base = await new Promise<string>((ok, falla) => {
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

  const auth = { authorization: 'Basic ' + btoa('alice:') };
  const reiniciar = () => { recibidas.length = 0; bytes = 0; };
  return {
    recibidas,
    bytes: () => bytes,
    salida: () => salida,
    pedir: (ruta, init = {}) => { reiniciar(); return fetch(`${base}/odata/v4/reporte/${ruta}`, { ...init, headers: { ...auth, ...init.headers } }); },
    pedirEnBatch: async ruta => {
      reiniciar();
      const cuerpo = `--b\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nGET ${ruta} HTTP/1.1\r\nAccept: application/json\r\n\r\n\r\n--b--\r\n`;
      const r = await fetch(`${base}/odata/v4/reporte/$batch`, { method: 'POST', body: cuerpo, headers: { ...auth, 'content-type': 'multipart/mixed; boundary=b' } });
      return r.text();
    },
    pedirMcp: async (ruta, metodo, params = {}) => {
      reiniciar();
      const r = await fetch(`${base}/mcp/${ruta}`, {
        method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: metodo, params }),
        headers: { ...auth, accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
      });
      const texto = await r.text();
      const json = texto.match(/^data: (.*)$/m)?.[1] ?? texto;
      return { status: r.status, mensaje: JSON.parse(json) };
    },
    cerrar: () => { cap.kill(); rap.close(); },
  };
}
