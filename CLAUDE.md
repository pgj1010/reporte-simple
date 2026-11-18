# CLAUDE.md — reporte-simple

Aplicación SAP CAP (Node.js, **TypeScript**) que consume un servicio OData V4 de RAP desde un sistema S/4HANA on‑premise y lo presenta con Fiori Elements. Sirve como **base reutilizable para reportes**.

**Convención (D7):** cada reporte es un **proyecto CAP independiente** (carpeta propia en `~/projects/`, repo propio, despliegue propio) con su **propio proyecto en Claude** y sus propios `CLAUDE.md`, `SPEC.md` y `PLAN.md`. No se agregan reportes nuevos dentro de este proyecto.

Antes de cualquier tarea, lee `PLAN.md` y `SPEC.md`, y trabaja **solo en la etapa activa**.

---

## Reglas del equipo

### Proceso
1. **Antes de crear o cambiar archivos, propón un plan y espera aprobación.**
2. Si una regla admite dos interpretaciones que producen datos distintos, **pregunta**.
3. Cada etapa se trabaja en **su propia rama** (`etapa-N-<nombre>`); el merge a `main` se hace después de la revisión del usuario.
4. Al terminar cada paso: corre `npm test`, muestra el resultado y actualiza `PLAN.md`.
4b. Con `npm test` en verde, haz **un commit por paso** en la rama de la etapa (mensaje: `etapa N: <qué se hizo> (<decisiones>)`). Nunca merge a `main` sin la revisión del usuario al cierre de la etapa.
5. **Nunca ejecutes `cf deploy` sin aprobación explícita.**

### Decisiones
6. Toda decisión propia se registra en `SPEC.md` (sección Decisiones).
7. Además, se anota en la sección **"Decisiones de la etapa"** de `PLAN.md` **en el momento de tomarla**, no al final. El informe de cierre de la etapa se arma copiando esa sección.
8. Al terminar cada etapa, lista todas las decisiones tomadas por tu cuenta, con **la regla que afectan** y **qué pasaría si fueran al revés**.

### Técnicas
9. CAP Node.js en **TypeScript**. Nunca CAP Java.
10. **Clean core flexible** (decisión D1 en `SPEC.md`): preferir APIs liberadas de S/4HANA. Si el cliente requiere algo que SAP no tiene liberado, se permite un servicio **RAP propio (Z) expuesto por OData**. Nunca RFC ni acceso directo a tablas desde BTP. Cada servicio Z usado se documenta en `SPEC.md` con el motivo.
11. Toda lectura de S/4 pasa por una **destination de BTP**; nunca credenciales en el código.
12. La lógica de negocio va en el **handler** del servicio; el modelo CDS se mantiene declarativo.
13. Cada regla de `SPEC.md` tiene un **test automático en `test/`**; las marcadas `[manual]` tienen sus pasos en `test/PRUEBAS_MANUALES.md`.
14. Cada etapa incluye una **prueba de mutación** de sus reglas principales. En este proyecto (solo lectura) se aplica a las reglas de **solo lectura** y **autorización** (decisión D3).
15. La autorización la aplica solo CAP con **`@requires` y `@restrict`**; no se escriben capas de autorización propias.
16. Mensajes al usuario en **español**.
17. Rutas de la app al servicio siempre **relativas** (nunca empiezan con `/`), p. ej. `"uri": "odata/v4/reporte/"` en `manifest.json`.
18. Los datos simulados de S/4 van en **`test/data/`** y nunca viajan a producción.

---

## Entorno

- **IDE:** SAP Business Application Studio, Dev Space *Full Stack Cloud Application*.
- **Proyecto:** `/home/user/projects/reporte-simple` (abrir esta carpeta como raíz del workspace).
- **CAP:** `@sap/cds` 10.x, `@sap/cds-dk` 10.x global, Node 24, **TypeScript `~6.0`** (no subir a 7, ver Lecciones aprendidas).
- **Módulos:** `"type": "module"` → ESM (`import` / `export default`). Nunca `require` ni `module.exports`.
- **TypeScript nativo de Node 24 (D13):** sin `tsx` ni `ts-node`. Solo sintaxis borrable (`erasableSyntaxOnly`: nada de `enum`, `namespace` ni parameter properties); `import type` para tipos (`verbatimModuleSyntax`); imports relativos con extensión `.ts`. Revisar tipos con **`npx tsc --noEmit -p tsconfig.test.json`** (incluye `test/`). `tsconfig.json` solo incluye `srv` y `@cds-models` para que `cds build` no compile los tests ni el mock (D30).
- **Cloud Foundry:** API `<CF_API>`, org `<CF_ORG>`, space `dev`. Login con `cf login --sso`.

## Sistema origen (RAP)

> Los datos internos aparecen como marcadores (`<S4_HOST>`, `<S4_CLIENTE>`, `<CF_ORG>`…, D67). Los valores reales están en **`LOCAL.md`** (no versionado, solo en el Dev Space); dónde se configura cada uno: `README.md` → *Configuration (deployment)* (en español: `README.es.md` → *Configuración (despliegue)*). Nunca volver a escribir los valores reales en archivos versionados.

| Dato | Valor |
|---|---|
| Host interno | `<S4_HOST>:<S4_PUERTO>` (HTTP), cliente `<S4_CLIENTE>` |
| Service binding | `ZMAKS_SB_CONEXIONES` (OData V4 – UI → ruta usa `srvd`, no `srvd_a2x`) |
| Service definition | `ZMAKS_SD_CONEXIONES` |
| Ruta del servicio | `/sap/opu/odata4/sap/zmaks_sb_conexiones/srvd/sap/zmaks_sd_conexiones/0001` |
| Entidades | `Conexiones` (key CarrierId, ConnectionId) → `_Flight` → `Vuelos` (key CarrierId, ConnectionId, FlightDate) |
| Destination BTP | `S4_BACKEND` en el código (OnPremise, BasicAuthentication, sin Location ID). Si la del subaccount se llama distinto, el nombre real va en `deploy/destination.mtaext` (no versionado, D65; ver `LOCAL.md`) |
| Cloud Connector | Recurso `/sap/opu/odata` con *Path and all sub-paths* (cubre también `odata4`) |

## Estructura

```
reporte-simple/
├── app/<reporte>/               # apps Fiori Elements (una por reporte)
├── srv/
│   ├── external/<SERVICIO>.cds  # GENERADO por cds import — NO EDITAR (también el F4 de aeropuertos, D49)
│   ├── service.cds              # proyecciones expuestas + @requires/@restrict
│   ├── service.ts               # delegación de lecturas al servicio remoto
│   ├── agent-service.cds        # ReporteAgentService: solo MCP, para agentes de IA (D70); función ocupacionPorConexion (D72)
│   └── agent-service.ts         # delegación de sus lecturas al RAP; ocupación con $apply sin alias (D72)
├── deploy/destination.mtaext.ejemplo  # plantilla del .mtaext con la destination real (D65)
├── scripts/limpiar-edmx-f4.ts   # copia de un .edmx F4 de RAP sin SAP__ParentService, para cds import (D49)
├── test/
│   ├── data/*.csv               # datos mock: <SERVICIO>-<Entidad>.csv (solo dev/test)
│   ├── *.test.ts                # tests automáticos (uno o más por regla de SPEC.md)
│   └── PRUEBAS_MANUALES.md      # pasos de reglas [manual]
├── CLAUDE.md
├── SPEC.md
└── PLAN.md
```

## Reglas de desarrollo

- Para dudas de CAP o del modelo CDS, usa primero las tools del servidor MCP cds-mcp (search_model, search_docs) antes de suponer.
- **README.md (inglés) es la fuente; cada cambio se replica en README.es.md en el mismo commit** (D76). Traducción fiel: misma estructura, diagrama, tablas y métricas; los términos técnicos (MCP, CAP, RAP, OData, tools) quedan en inglés.
- **No editar** `srv/external/*.cds`. Para regenerar: `cds import <archivo>.edmx --as cds --force`.
- Exponer entidades remotas como proyecciones `@readonly` en `srv/service.cds`.
- Lecturas remotas delegadas en `service.ts` con `this.on('READ', [...], req => remote.run(req.query))`. **Excepción, totales (D43):** las lecturas con `$apply` se reenvían tal cual al backend (`remote.send({ method: 'GET', path: req.req.url })`), porque CAP no delega `$apply`; el mock las resuelve con `cds.odata.parse`. Mientras exista ese reenvío, **ninguna entidad puede tener `@restrict` con `where`** (el reenvío no lo aplicaría): lo vigila un test.
- **Semántica primero (D8):** columnas, orden, filtros, filtros obligatorios, medidas/totales, textos, unidades y value helps se definen en la tabla **"Semántica del reporte"** de `SPEC.md`. Después se generan o ajustan las anotaciones en `app/<reporte>/annotations.cds` con `annotate ReporteService.<Entidad> with ...`, y se actualiza el test R11. No modificar el RAP para temas de presentación.
- **Análisis del servicio origen** (al inicio de cada reporte, en `SPEC.md`): revisar en el `$metadata` si trae `@UI` y etiquetas, si soporta `$apply` y qué transformaciones declara (`aggregate`, `groupby`, `filter`, `concat`…; el backend debe soportarlo para totales delegados, pero **CAP no lo delega solo**, ver abajo), si tiene parámetros CDS y si sus value helps apuntan a servicios disponibles. Si el reporte lleva totales, **preguntar al usuario si el Gateway soporta `concat`, `top` y `$count` dentro de `$apply`** (probarlo en `/IWFND/GW_CLIENT`): de eso depende si se puede usar la tabla analítica (ver Lecciones aprendidas).
- Anotaciones de referencia: filtros `@UI.SelectionFields`; obligatorios `@Capabilities.FilterRestrictions.RequiredProperties`; columnas `@UI.LineItem`; textos `@Common.Text` + `@UI.TextArrangement`; F4 `@Common.ValueList`; totales `@Analytics.Measure` + `@Aggregation.default: #SUM` + `@Aggregation.ApplySupported`; importes/unidades `@Measures.ISOCurrency` / `@Measures.Unit`.
- **Totales:** aunque el backend soporte `$apply`, **CAP no lo delega al servicio remoto** con `remote.run(req.query)` (ver Lecciones aprendidas). El patrón de totales se decide y documenta en `SPEC.md` (Etapa 4 de reporte-simple, laboratorio de totales); calcular en el handler solo si el backend no soporta `$apply` o el volumen es chico (y se registra como decisión). Si hay **parámetros CDS**, preferir que en el RAP sean filtros y marcarlos obligatorios en CAP; si deben seguir como parámetros, manejarlos en el handler.
- Navegación / drilldown, tipo de tabla y comportamiento → `app/<reporte>/webapp/manifest.json`.
- Credenciales del servicio remoto **solo** en perfiles `[production]` y `[hybrid]` del `package.json`. Sin perfil → CAP usa mock con `test/data`.
- Mantener `"cds": { "remote": { "native_fetch": false } }` → fuerza SAP Cloud SDK (native fetch ignora proxies OnPremise).
- Nunca commitear `.cdsrc-private.json`, `*.mtaext`, `LOCAL.md`, service keys, tokens ni contraseñas. No pegar `clientsecret` ni `Proxy-Authorization` en chats o logs.

## Cómo correr

| Modo | Comando | Datos |
|---|---|---|
| Local (default) | `npm run watch` (= `CDS_TYPESCRIPT=false cds watch`) | CSV en `test/data/` |
| Tests | `npm test` | CSV en `test/data/` |
| Desplegado | `mbt build && cf deploy mta_archives/*.mtar -e deploy/destination.mtaext` (**solo con aprobación**; `-e` solo si la destination no se llama `S4_BACKEND`, D65) | RAP real vía destination + connectivity |

- Si el puerto 4004 está ocupado: `pkill -f "cds"` y volver a arrancar. Solo un `cds watch` a la vez.
- Abrir: `Ctrl+Shift+P` → *Ports: Preview* → 4004. Usuario mock: `alice` sin contraseña.
- Servicio: `/odata/v4/reporte/<Entidad>`. App: `/<reporte>/webapp/index.html`.
- Logs de llamadas remotas: `DEBUG=remote npm run watch`.
- ⚠️ Un `cds watch` a secas también funciona, pero imprime `Error: detected tsconfig.json, but could not run with 'tsx'`. Es inofensivo: **no** instalar `tsx` como sugiere el mensaje (ver Lecciones aprendidas).

## Lecciones aprendidas (no repetir)

- `cds init` en cds-dk 10 no crea `package.json` → ejecutar `cds add nodejs`.
- Después de `cds import`, correr **`npm install`**: el import agrega dependencias del Cloud SDK al `package.json` pero no las instala.
- **Modo `hybrid` desde BAS no llega a sistemas on‑premise**: ni directo ni por túnel `cf ssh` (las peticiones no llegan al Cloud Connector). Probar datos reales **solo desplegando** a Cloud Foundry.
- El "Check Connection" de la destination solo valida el host, no las rutas.
- El 404 en `/odata/v4/zmaks-sb-conexiones/...` es normal fuera de modo mock; usar siempre `/odata/v4/reporte/...`.
- Las **asociaciones importadas de RAP llegan sin condición `on`** (`_Flight : Association to many Vuelos { }`): el `$metadata` V4 no publica condiciones. **En producción las resuelve el RAP** (CAP delega `/_Flight` y `$expand=_Flight` tal cual); **solo el mock necesita ayuda** (SQLite: "has no foreign keys"). No redefinir la asociación en `srv/`: CAP pediría al RAP una navegación que no existe. Confirmar la condición en ADT y simularla en `test/mock/` (cargado por `test/mocked.js`, que CAP desactiva en producción) — D25, D26, D29.
- El generador de Fiori suele crear rutas absolutas (`/odata/v4/...`) → corregir a relativas (regla 17).
- **`tsx` + `cds-plugin-ui5` agota la memoria** (~2 GB en ~12 s) tanto en `cds watch` como en `node:test`. Por eso el proyecto usa TypeScript nativo de Node 24 (D13) y no tiene `tsx`. `CDS_TYPESCRIPT=false` no se puede fijar con `.env` ni en `package.json` (cds-dk lo lee de `process.env` antes de cargar la configuración): va en los scripts `npm run watch` / `watch-conexiones` y en `.vscode/`.
- **TypeScript 7 rompe el lint de Fiori tools:** `typescript-eslint` (vía `@sap-ux/eslint-plugin-fiori-tools`) pide `typescript <6.1` y con TS 7 ESLint se cae (`Cannot read properties of undefined (reading 'Intrinsic')`). `cds add typescript` instala TS 7: fijar `typescript: "~6.0"` y no subirlo hasta que `typescript-eslint` lo soporte (`npm view typescript-eslint peerDependencies`). `npm test` incluye `npm run lint` (D35), así que un lint roto se detecta.
- **CAP no delega `$apply` al servicio remoto aunque el backend lo soporte** (comprobado el 2026-11-10 con un RAP simulado): con `remote.run(req.query)`, `aggregate(...)` se descarta y CAP pide las filas sueltas (`/Vuelos?$top=1000`, un "total" que en realidad son filas) y `groupby(...,aggregate(...))` da 500 sin llamar al backend. En el mock, `ReporteService` además pierde los alias de agregado que no coinciden con un campo de la entidad (`sum as Total` → `{}`), porque CAP remapea el resultado de la proyección solo con sus elementos. Los totales necesitan un patrón explícito (D43).
- **La tabla analítica de Fiori V4 (`AnalyticalTable`) necesita `concat`, `top` y `$count` en `$apply`** (pide `concat` anidado con `groupby(...)/aggregate($count as UI5__count)` y `.../top(n)`), no solo `aggregate`/`groupby`/`filter`. El Gateway de este S/4 rechaza los tres (2026-11-10, D46/D47). Preguntar al inicio de cada reporte si el Gateway los soporta; si no, **totales en la cabecera del detalle o en indicadores** (una petición `groupby/aggregate` desde el handler, D47) y tabla responsive.
- En un handler, **dentro de `$batch`** (como pide Fiori) `req.http.req` es el **sobre** (`/$batch`), no la sub-petición: para la URL de la lectura usar `req.req.url`. Probar siempre también con `$batch`.
- Con `$apply=concat(A,B)`, el adaptador OData de CAP **ya separa** el `concat` y llama al handler **una vez por rama** (con la CQN de esa rama), pero `req.req.url` trae la URL completa: reenviarla tal cual duplica el resultado (D46).
- **En GitHub Actions `cds` colorea su salida aunque no escriba en una terminal** (2026-11-18, CI rojo en `bcb11e1`): `cds env get features.test_mocks` devolvió `\x1B[33mfalse\x1B[39m` y el test comparaba con `'false'` (en local salía en verde). Se reproduce con `FORCE_COLOR=1`. Todo proceso hijo cuya salida se compara se lanza con `SIN_COLOR` (`NO_COLOR=1`, `FORCE_COLOR=0`) y su salida pasa por `sinAnsi` (`test/helpers.ts`): `cdsCli`, `test/rap-simulado.ts` y `test/mutacion.ts`. Los tests nuevos que lean salida de un proceso usan esos helpers; nunca comparar texto de consola sin limpiarlo.
- Con el plugin UI5 activo, `node --test` no termina (el livereload deja el proceso abierto): `npm test` corre con `CDS_PLUGIN_UI5_ACTIVE=false` (D12).
- `cds.test` necesita `@cap-js/cds-test` y, para simular el servicio remoto, los argumentos `--with-mocks --in-memory`.
- TypeScript 6+ ya no carga `@types/*` automáticamente: `tsconfig.json` declara `"types": ["node", "@cap-js/cds-types"]`. No mapear `@sap/cds` en `paths`: el runtime lo resolvería al `.d.ts`.
- Los value helps del RAP (`@Common.ValueListReferences`) apuntan a **otros servicios** (p. ej. `/dmo/i_airport_stdvh`) que `cds import` no trae: el F4 no funciona en CAP hasta importar ese servicio o definir un `@Common.ValueList` propio.
- **Importar un servicio F4 de RAP** (`/srvd_f4/...`): su `$metadata` referencia al servicio padre con el alias `SAP__ParentService` y `cds import` falla ("Could not resolve the schema SAP__ParentService…"). No editar el `.edmx` a mano: `node scripts/limpiar-edmx-f4.ts <original>.edmx <copia>.edmx` y `cds import <copia>.edmx --as cds --force` (D49). La ruta del F4 **necesita los parámetros de matriz** `;ps='srvd-<sd>-0001';va='<…campo>'` (sin ellos el Gateway responde error, D51). En CAP se expone como entidad `@readonly` del servicio y se anotan los campos con `@Common.ValueList` propio, anulando los `@Common.ValueListReferences` del RAP (D50).
- Los servicios **RAP V4** importados traen el vocabulario UI con el alias **`SAP__UI`** (`$Type: 'SAP__UI.DataField'`, `'SAP__UI.ReferenceFacet'`) y CAP no lo reconoce: avisos `SAP__UI.* is not a known vocabulary type`, tabla del List Report **sin columnas** y Object Page vacía (solo funcionan `SelectionFields` y los `DataPoint`). Por eso las anotaciones `@UI` **siempre** se definen en `app/<reporte>/annotations.cds`, con tipos `UI.*`, a partir de la tabla de semántica (D22). No editar `srv/external`.
