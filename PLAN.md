# PLAN.md — reporte-simple

Objetivo: reporte de **Conexiones y Vuelos** en CAP (TypeScript) + Fiori Elements, leyendo el servicio RAP `ZMAKS_SB_CONEXIONES`, desplegado en Cloud Foundry, y dejarlo como **plantilla para futuros reportes**.

Reglas del plan (ver `CLAUDE.md`):
- Una etapa a la vez, en su propia rama `etapa-N-<nombre>`. Merge a `main` solo tras revisión del usuario.
- Proponer plan y esperar aprobación antes de tocar archivos.
- Al terminar cada paso: `npm test`, mostrar resultado, actualizar este archivo.
- Cada decisión propia se anota en **"Decisiones de la etapa"** en el momento de tomarla (y en `SPEC.md`).
- Al cerrar la etapa: marcar `[x]`, listar decisiones (regla afectada + qué pasaría si fueran al revés), actualizar "Etapa activa" y la Bitácora.

**Etapa activa:** 6 — Seguridad, limpieza y publicación como portafolio (rama `etapa-6-limpieza`; pasos 0–7 hechos, clon listo para push; **pendiente de revisión y merge a `main` por el usuario**)

---

## Etapa 0 — Proyecto base ✅
- [x] `cds init` + `cds add nodejs` + `npm install`
- [x] Abrir `reporte-simple` como raíz del workspace en BAS

Salida: `cds watch` arranca sin errores.

## Etapa 1 — Servicio remoto y datos mock ✅
- [x] Descargar `$metadata` (V4, ruta `srvd`) e importar con `cds import --as cds`
- [x] `npm install` para instalar el Cloud SDK
- [x] `srv/service.cds` con proyecciones `@readonly` de `Conexiones` y `Vuelos`
- [x] `srv/service.js` (ESM) delegando `READ` al servicio remoto
- [x] Credenciales solo en perfiles `[production]` / `[hybrid]`; `remote.native_fetch: false`
- [x] CSV mock (provisionalmente en `srv/external/data/`)

Salida: `/odata/v4/reporte/Conexiones` y `/Vuelos` devuelven los datos de los CSV.

### Decisiones de la etapa
- D4 — No usar `hybrid` desde BAS para datos reales.
- D5 — `native_fetch: false`.

## Etapa 2 — Alineación con reglas del equipo ✅
Rama: `etapa-2-alineacion`
- [x] Inicializar Git, primer commit en `main` con lo actual (incluye `app/conexiones` ya generada); crear rama de la etapa
- [x] Configurar `npm test` (`cds.test` + `node:test`; `tsx` descartado por D13) — adelantado (D9). Requiere `@cap-js/cds-test`; arranque con `--with-mocks --in-memory`; plugin UI5 desactivado en tests (D12)
- [x] Migrar a TypeScript: `cds add typescript`, `service.js` → `service.ts`, tipos con cds-typer (`pretest` los genera). TypeScript nativo de Node 24, sin `tsx` (D13)
- [x] Mover CSV de `srv/external/data/` a `test/data/` y verificar que `cds watch` y los tests los cargan (4 conexiones, 5 vuelos: `init from test/data/...`)
- [x] Verificar que `cds build --production` **no** incluye `test/data` (sin CSV ni carpetas `test/`/`data/`; perfil `production` → destination `S4_BACKEND`, desarrollo → mock)
- [x] Agregar `@requires: 'authenticated-user'` a `ReporteService` (R3) — sin usuario 401, con `alice` 200 (test + `npm run watch`)
- [x] Mensajes siempre en español (R10, D11, D15): `srv/server.ts` + `_i18n/messages_es.properties`. Los textos fijos del parser OData de CAP quedan fuera de R10 (D17)
- [x] Tests para R1, R2, R3, R4, R5, R6, R10 — `test/r<N>-*.test.ts` (uno por regla) + `test/helpers.ts`. R5 incluye el build (D14); R4 según D16
- [x] Pruebas de mutación de R2 y R3 (quitar `@readonly` / `@requires` → el test debe fallar): manual en el árbol real + `npm run test:mutacion` (D10 ampliada). R2 requirió D18
- [x] Crear `test/PRUEBAS_MANUALES.md` (R8, R9): pasos y resultados esperados definidos; se ejecutan en las Etapas 3 (R8) y 4 (R9)

Salida: `npm test` en verde; mutaciones detectadas; `cds watch` sigue mostrando los datos mock.

### Decisiones de la etapa
Heredadas (tomadas antes de iniciar la etapa):
- D1 — Clean core flexible (aprobado por el usuario).
- D2 — Migrar a TypeScript ahora (aprobado por el usuario).
- D3 — Mutación solo para R2 y R3 (aprobado por el usuario).
- D6 — ~~`node:test` + `tsx` para los tests.~~ **Reemplazada por D13.**
- D7 — Cada reporte es un proyecto CAP independiente (decisión del usuario).

Tomadas durante la etapa (en el orden en que se tomaron):
- D9 — `npm test` se configura en el paso 2 (antes de la migración a TS) para cumplir la regla 4 desde el inicio. Propuesta propia, aprobada.
- D10 — Mutación en script aparte (`npm run test:mutacion`) sobre una copia temporal del proyecto; nunca modifica los archivos reales. Propuesta propia, aprobada.
  - **Ampliada (decisión del usuario, opción B):** la primera vez, además, mutación **manual** en el árbol real (editar → `npm test` en rojo → `git checkout` → `npm test` en verde → `git diff` vacío), una mutación a la vez. El script hace un control sin mutar, comprueba que la mutación cambió el archivo, corre solo los tests de la regla y verifica por hash que el archivo real no cambió.
- D11 — R10: mensajes **siempre en español, sin importar el idioma del navegador**. Decisión del usuario. Si fuera al revés: un navegador en inglés vería los errores en inglés; para reportes de clientes con otros idiomas habría que revisar D11 y D15 juntas.
- D12 — `npm test` corre con `CDS_PLUGIN_UI5_ACTIVE=false`: con el plugin UI5 el proceso de test no termina (y con `tsx` se caía por memoria); los tests cubren el servicio OData, no la app. Propia.
- D13 — TypeScript nativo de Node 24, sin `tsx` (reemplaza a D6). `tsx` + `cds-plugin-ui5` agota la memoria en `cds watch` y en tests. `npm run watch` = `CDS_TYPESCRIPT=false cds watch` (no se puede fijar por `.env` ni `package.json`). `tsconfig`: `erasableSyntaxOnly`, `verbatimModuleSyntax`, `rewriteRelativeImportExtensions`. Propuesta propia, aprobada por el usuario con esos ajustes.
- D14 — El test de R5 corre `cds build --production` **dentro de `npm test`** (~2 s), sin script aparte. Si llegara a pasar de ~15 s, se separaría en `npm run test:build`. Propia.
- D15 — R10 se implementa con (1) un middleware en `srv/server.ts` que fija `req.locale = 'es'` en toda petición y (2) `_i18n/messages_es.properties` con **todas** las claves de `@sap/cds/_i18n/messages.properties` traducidas (un test vigila que no falte ninguna). Propia.
- D16 — R4 "CAP no guarda copia" se prueba así: (a) cada GET llega al servicio remoto; (b) el DDL del perfil `production` no crea tablas ni vistas para `ReporteService` ni `ZMAKS_SB_CONEXIONES`; (c) en desarrollo `ReporteService_*` son **vistas** sobre el mock del remoto. Propia, aprobada por el usuario.
- D17 — R10 excluye los textos fijos del parser OData de CAP (solo aparecen con URLs manuales, no desde la app Fiori). Decisión del usuario.
- D18 — El test de R2 exige además el código `ENTITY_IS_READ_ONLY` (no solo el 405): el RAP ya trae `Insertable/Updatable/Deletable: false` y sin `@readonly` CAP rechaza igual con `ENTITY_IS_NOT_CRUD`, así que el 405 solo no detectaba la mutación. Decisión del usuario (opción A).
- Criterio de proceso (usuario): un commit por paso con `npm test` en verde → regla de proceso 4b de `CLAUDE.md`.

### Informe de cierre — Etapa 2 (2026-11-09)

**Resultado:** `npm test` **43/43** en verde (R1, R2, R3, R4, R5, R6, R10 + arranque); `npm run test:mutacion` **2/2** mutaciones detectadas (R2, R3); `npm run watch` sirve los datos mock (4 conexiones, 5 vuelos) y la app (`/conexiones/index.html` → 200) sin errores de memoria. Rama `etapa-2-alineacion` con un commit por paso; **sin merge a `main`** (pendiente de revisión del usuario).

**Decisiones tomadas por mi cuenta** (propuestas por Claude; se indica si el usuario las aprobó después):

| ID | Decisión | Regla que afecta | Qué pasaría si fuera al revés |
|---|---|---|---|
| D9 | Configurar `npm test` antes de migrar a TS (aprobada) | Proceso 4 | Los pasos 3 a 7 se habrían cerrado sin `npm test`, incumpliendo la regla 4. |
| D10 | Mutación en script sobre copia temporal (aprobada; ampliada por el usuario) | Técnicas 13 y 14, D3 | Mutando los archivos reales dentro de `npm test`, una ejecución cortada podría dejar `service.cds` sin `@readonly`/`@requires`; además `npm test` sería más lento. |
| D12 | `npm test` con el plugin UI5 desactivado | Técnica 13 | Con el plugin, `node --test` no termina (livereload abierto); la app se valida con las pruebas manuales R8/R9. |
| D13 | TypeScript nativo de Node 24, sin `tsx` (aprobada con ajustes) | Técnicas 9 y 13, D6 | Con `tsx`, `cds watch` y `npm test` se caen por memoria al cargar `cds-plugin-ui5`: habría que elegir entre app Fiori o TypeScript en local. El costo de D13: no se puede usar sintaxis TS no borrable (`enum`, `namespace`), lo que `tsc` detecta. |
| D14 | Build de producción dentro de `npm test` | R5, técnica 13 | En un script aparte, un CSV colado en el build pasaría `npm test` sin ser detectado si nadie corre el otro script. |
| D15 | `srv/server.ts` fija `req.locale = 'es'` + todas las claves de CAP traducidas | R10, regla 16, técnica 12 | Con solo `default_language: es`, un navegador en inglés recibiría los errores en inglés; traduciendo solo algunas claves, un error no previsto saldría en inglés. Efecto colateral aceptado: las etiquetas de `$metadata` también quedan en español. |
| D16 | R4 se prueba con el DDL de producción + vistas en desarrollo (aprobada) | R4 | Exigir "ninguna tabla" también en desarrollo haría R4 incompatible con el mock de R5 (CAP simula el remoto con tablas SQLite). |

Decisiones del usuario en esta etapa: D11, D17, D18, la ampliación de D10 y el criterio de commit por paso (regla 4b). Detalle completo en `SPEC.md` → Decisiones.

**Correcciones durante la etapa** (no son decisiones, pero cambiaron lo hecho):
- El test de R5 fallaba de forma intermitente con `cds build -o` (dos tareas escribiendo el mismo `package.json`); ahora usa `CDS_BUILD_TARGET` relativo (`_out/`), que es el mismo camino que el despliegue.
- El test de R2 solo con 405 no detectaba la mutación de `@readonly` → D18.

**Pendientes para próximas etapas** (también anotados en cada etapa):
- **Etapa 3:** la app `app/conexiones` ya existe (generada antes de la etapa): revisarla en vez de regenerarla · `manifest.json` con ruta absoluta `/odata/v4/reporte/` (regla 17) · asociación `_Flight` sin condición `on` (R7) · TypeScript 7 vs `typescript-eslint` de la app (`<6.1`) · ejecutar R8 de `test/PRUEBAS_MANUALES.md` · arrancar siempre con `npm run watch` (D13).
- **Etapa 4:** avisos del build `SAP__UI.* is not a known vocabulary type` (vienen de `srv/external`, generado) · value help de aeropuertos · ejecutar R9 de `test/PRUEBAS_MANUALES.md` · decidir medidas/totales y drilldown.
- **Etapa 5:** el build compila **todo** el TS (falta `include` en `tsconfig.json`): los tests compilados terminan en `gen/srv/test/` y viajarían a producción · confirmar que `srv/service.ts`, `srv/server.ts` y `@cds-models` quedan compilados en `gen/srv` · no usar `cds build -o` (otra estructura, sin compilar TS) ni `CDS_BUILD_TARGET` absoluto (`tsc` escribe dentro del proyecto) · artefactos HANA (`cds.outbox.Messages`) sin base de datos propia · verificar con XSUAA que el 401 sale por la clave traducida ("No autenticado") · los tests de R4/R5 usan el `cds` de cds-dk **global**: tenerlo en cuenta si se agrega CI.

## Etapa 3 — App Fiori Elements (List Report + Object Page) ✅
Rama: `etapa-3-fiori`
- [x] ~~Generar app~~ La app `app/conexiones` ya fue generada (2026-11-09, antes de la Etapa 2; List Report V4, `Conexiones` + `_Flight`): **revisarla** en lugar de regenerarla. Revisada el 2026-11-10; hallazgos en los pendientes de abajo
- [x] Corregir rutas del `manifest.json` a **relativas** (`odata/v4/reporte/`). Test automático de la regla 17 (D19, mutación manual detectada con `/` y `http://`); los tests OPA quedan fuera (D20); proxy local en `ui5.yaml` (D21). Verificado con curl (4 conexiones con `alice`, 401 sin usuario, sin bucle de proxy) y en el navegador por el usuario: los datos llegan por `/conexiones/odata/v4/reporte/` y aparecen los filtros de aeropuerto de salida y de destino
- [x] Verificar tabla, filtros (R8) y textos heredados del RAP. Tabla y etiquetas: R11 + verificación del usuario (D22, D24). Textos que siguen en inglés desde el RAP: pasados a la Etapa 4 (pendiente de D24). Filtros: ver R8 abajo
- [x] **Adelantado de la Etapa 4 (bloquea R7):** la tabla sale **sin columnas** por defecto (el usuario tuvo que agregarlas a mano; la variante queda "Estándar*"): el `@UI.LineItem` del RAP no se aplica. Investigar la causa (¿avisos `SAP__UI.* is not a known vocabulary type`?) y resolverlo sin editar `srv/external`, con la tabla **Semántica del reporte** como fuente (D8). Revisar también la página de detalle (`Facets`, `HeaderInfo`)
  - [x] `SPEC.md`: causa en "Análisis del servicio origen", Origen `CAP` en la semántica, sección "Página de detalle", D22 · `CLAUDE.md`: lección aprendida · `annotations.cds` desde la tabla · test R11 adelantado · verificación del usuario en el navegador (8 columnas sin personalizar, en incógnito o sin la variante armada a mano). **Hecho (2026-11-10):** `annotations.cds` con tipos `UI.*` (D22), unidad de `Distance` (D23), etiquetas de `Vuelos` en español (D24); R11 lee la tabla de `SPEC.md` (mutación rápida detectada); avisos de `cds compile` 34 → 0; `npm test` 64/64. Confirmado por el usuario en incógnito: 8 columnas sin personalizar, variante "Estándar" sin asterisco, cabecera y "Detalles de conexión" correctos. "Detalles de vuelos" sigue pendiente de R7
- [x] Resolver la asociación `_Flight` (condición `CarrierId` + `ConnectionId`) para que el detalle muestre vuelos (R7). **Hecho (2026-11-10):** mock en `test/mock/rap.ts`, cargado por `test/mocked.js` (D25, D29), con la condición confirmada en ADT; `srv/` sin cambios. Tests `r7-navegacion` (mock, incluye conexión sin vuelos `LH 0402`, D28) y `r7-produccion` (proceso aparte con `NODE_ENV=production`: `_Flight` llega al RAP tal cual y el mock no se activa, D26). R10 cubre los 500 (D27). Mutaciones manuales detectadas: mock desactivado (7/8 fallan), condición sin `ConnectionId` (4/8), `_FlightCAP as _Flight` en `srv/` (3/3 de delegación). El build de producción incluía `test/` compilado (también el mock): `include` en `tsconfig.json` + `tsconfig.test.json` (D30, adelantado de la Etapa 5); `npm test` 82/82. Verificado por el usuario en el navegador (2026-11-10): AA 0017 muestra exactamente sus 2 vuelos (1 y 15 dic 2026), todo en español. LH 0402: "Detalles de vuelos" vacía con "Todavía no hay entradas", sin error (confirmado por el usuario). Hallazgo: "Precio vuelo" muestra 423 USD en vez de 422.94 → R12
- [x] R12 — importes con decimales completos (hallazgo del usuario: 423 USD en vez de 422.94). Anotación `@odata.Type`/`Precision`/`Scale: 'variable'` de `Price` en `srv/service.cds` (D31, D32); test `r12-importes` (todos los `Edm.Decimal` del RAP; mutación sin la anotación detectada, 2/4 fallan); paso 7b de R9 en `PRUEBAS_MANUALES.md` ("422,94 USD"). Verificado por el usuario en el navegador (2026-11-10): AA 0017 muestra los decimales correctos (ya no 423)
- [x] Probar drilldown a la página de detalle. Verificado por el usuario: AA 0017 (2 vuelos) y LH 0402 (vacía, sin error)
- [x] Ejecutar R8 de `test/PRUEBAS_MANUALES.md` y registrar el resultado. **Hecho (2026-11-10):** pasos 1–5 ✔; paso 6 (F4) sin respuesta, como se esperaba (Etapa 4); paso 7 eliminado (D37)
- [x] Arrancar siempre con `npm run watch` (D13); no instalar `tsx`. Es un recordatorio permanente, ya está en `CLAUDE.md`
- [x] ~~**Pendiente (revisión de la app):** `webapp/index.html` tiene `lang="en"` → `lang="es"` (D11). Relacionado: el UI5 tooling avisa `Generated supported locales ('') for bundle 'i18n/i18n.properties' do not contain default fallback locale 'en'` (falta `supportedLocales` / `fallbackLocale` en `manifest.json`, o `i18n_es.properties`)~~ **Hecho (2026-11-10):** R13 — `lang="es"` y `data-sap-ui-language="es"` en `index.html`; `supportedLocales: [""]` + `fallbackLocale: ""` en los 3 bundles de `manifest.json`, manteniendo `i18n.properties` (D33, D34). El aviso de locales desapareció del manifiesto servido. Test `r13-idioma-app` (mutaciones detectadas: `lang="en"`, sin `fallbackLocale`, `i18n_en.properties`). Prueba manual R13 hecha por el usuario (Chrome en inglés, ventana normal con recarga forzada): pasos 1–3 ✔
- [x] **Pendiente (revisión de la app), resuelto o movido (2026-11-10):** `annotations.cds` vacío → ya no aplica, se llenó con D22 · UI5 1.154.0 desde el CDN en `index.html` → **movido a la Etapa 5** (`index.html` solo se usa en local / app router, D34) · `sap.fiori.archeType: transactional` en una app de solo lectura → se deja (D36) · `.appGenInfo.json` con `http://localhost:4004/...` → no se toca (D20)
- [x] **Pendiente (de Etapa 2):** `cds add typescript` instaló TypeScript 7 y `@sap-ux/eslint-plugin-fiori-tools` (vía `typescript-eslint`) pide `typescript <6.1`. Afecta solo al lint de la app; decidir cómo resolverlo. **Hecho (2026-11-10, D35):** el lint no solo avisaba, se caía (`reading 'Intrinsic'`). `typescript: "~6.0"` (6.0.3); lint en verde (2,6 s, 167 reglas, error de control detectado) y dentro de `npm test` (`test/lint.test.ts`); `cds build --production` sin cambios; `npm test` 97/97

Salida: la app abre, lista las conexiones mock y navega al detalle con sus vuelos; `npm test` en verde.

### Decisiones de la etapa
- D19 — Test automático de la regla 17 (`test/regla17-rutas.test.ts`): ningún `dataSources.*.uri` de `app/*/webapp/manifest.json` empieza con `/` ni con `http`. Propuesta propia, aprobada por el usuario.
- D20 — La regla 17 aplica a la app desplegable, no a los tests OPA: `FirstJourney.js` conserva la ruta absoluta (una relativa se resolvería contra la página de test). Decisión del usuario.
- D21 — En local la ruta relativa resuelve a `/conexiones/odata/...` (404): `backend` en el `fiori-tools-proxy` de `app/conexiones/ui5.yaml` (`/odata` → `http://localhost:4004`), solo desarrollo. Decisión del usuario (opción 1).
- Cambio de plan (usuario, 2026-11-10): las anotaciones de tabla y detalle se adelantan de la Etapa 4 a la Etapa 3 porque bloquean R7.
- D22 — Causa de la tabla sin columnas: el RAP usa el alias `SAP__UI` y CAP publica el vocabulario como `UI`, así que Fiori descarta los registros. Las anotaciones `@UI` tipadas se redefinen en `app/conexiones/annotations.cds` desde la tabla de semántica, sin tocar `srv/external`; R11 se adelanta. Decisión del usuario (opción A).
- D23 — `@Measures.Unit: DistanceUnit` en `annotations.cds` (el RAP no lo trae); Origen de la unidad: CAP. Decisión del usuario (opción a).
- D24 — "Etiqueta" de la tabla de semántica = también `@Common.Label`; etiquetas de `Vuelos` en español en `annotations.cds` (D11). Decisión del usuario (opción a).
- D25 — `_Flight` se simula solo en el mock (`test/mock/rap.ts`), sin tocar el modelo, con la condición de ADT (`CarrierId` + `ConnectionId`). Decisión del usuario (variante a).
- D26 — Camino de producción de R7 en un proceso aparte (`NODE_ENV=production`, RAP simulado con `CDS_CONFIG`); verifica también que el mock no se activa en producción. Decisión del usuario.
- D27 — R10 cubre los 5xx: en producción "Error interno del servidor"; en desarrollo, el detalle técnico de CAP. Decisión del usuario (opción a).
- D28 — Conexión `LH 0402` sin vuelos en `test/data` (caso vacío de R7); conteos de R2, R5 y R8 actualizados. Propuesta propia, aprobada por el usuario.
- D29 — El mock se carga con el gancho nativo `test/mocked.js` (CAP lo desactiva en producción) en vez de `cds.requires.[development]`. Propuesta propia, aprobada por el usuario.
- D30 — `include: ["srv", "@cds-models"]` en `tsconfig.json` (el build ya no lleva `test/`) y `tsconfig.test.json` para revisar los tipos de los tests. Adelantado de la Etapa 5. Decisión del usuario (opción a).
- D31 — `Price` con `@odata.Type` + `@odata.Precision: 16` + `@odata.Scale: 'variable'`, igual que el RAP; R12 compara todos los `Edm.Decimal`. Decisión del usuario (opción a).
- D32 — La anotación de D31 va en `srv/service.cds`, no en `annotations.cds`. Decisión del usuario.
- D33 — App de un solo idioma: `supportedLocales: [""]` + `fallbackLocale: ""` con `i18n.properties` sin sufijo (en vez de renombrar a `i18n_es.properties`): es lo que el UI5 tooling ya generaba y donde escribe Fiori tools. Decisión propia tras comparar las dos opciones, pedida por el usuario.
- D34 — R13 como regla aparte de R10; idioma de UI5 fijo en `index.html`. Límite: en Work Zone / Launchpad manda el idioma del launchpad (verificar en Etapa 5). Decisión del usuario.
- D35 — `typescript: "~6.0"` (TS 7 rompe `typescript-eslint`) y `npm run lint` dentro de `npm test` (~3 s). Decisión del usuario (opción a).
- D36 — `sap.fiori.archeType: "transactional"` se deja en `manifest.json` aunque la app sea de solo lectura. Propuesta propia, aprobada por el usuario.
- D37 — Se quita el paso 7 de R8 (DevTools: URL relativa y campos del `$filter`): lo cubren D19, D21 y los pasos 3–4. Propuesta del usuario.

### Informe de cierre — Etapa 3 (2026-11-10)

**Resultado:** `npm test` **97/97** en verde (R1–R7, R10–R13, regla 17, D35 lint + arranque); `npm run test:mutacion` **2/2** mutaciones detectadas (R2, R3); `npx tsc --noEmit -p tsconfig.test.json` y `npm run lint` sin errores; `cds build --production` sin `test/`, sin CSV y sin el mock. Pruebas manuales: R8 ✔ (pasos 1–5; paso 6 F4 sin respuesta, esperado), R13 ✔ (pasos 1–3 por el usuario; paso 4 verificado por Claude en la salida de `npm run watch`; paso 5 no verificado). Verificado por el usuario en el navegador: 8 columnas, detalle, AA 0017 con 2 vuelos y 422,94 USD, LH 0402 vacía sin error, interfaz en español con el navegador en inglés. Salida de la etapa cumplida: la app abre, lista las conexiones mock y navega al detalle con sus vuelos. Rama `etapa-3-fiori` con un commit por paso; **sin merge a `main`** (pendiente de revisión del usuario).

**Decisiones tomadas por mi cuenta** (propuestas por Claude; todas aprobadas después por el usuario):

| ID | Decisión | Regla que afecta | Qué pasaría si fuera al revés |
|---|---|---|---|
| D19 | Test automático de la regla 17: ningún `dataSources.*.uri` de `app/*/webapp/manifest.json` empieza con `/` ni con `http` | Técnica 17, técnica 13 | Sin el test, el generador de Fiori podría volver a dejar una ruta absoluta sin aviso, y la app desplegada daría 404 detrás del app router. |
| D28 | Conexión `LH 0402` sin vuelos en `test/data` (cambian los conteos de R2, R5 y R8) | R7, R2, R5, R8 | Probando con una conexión inexistente se obtendría un 404, no la tabla vacía; sin el caso, un mock que fallara con conexiones sin vuelos (posible en el RAP real aunque declare `[1..*]`) pasaría inadvertido. |
| D29 | El mock se carga con el gancho nativo `test/mocked.js` (CAP lo desactiva con `NODE_ENV=production`), no con `cds.requires.[development]` | D25, R5, técnicas 9 y 18 | Con `cds.requires.[development]` habría que repetir la configuración en `[test]`, y el mock dependería de que nadie copie esa entrada a otro perfil. |
| D33 | App de un solo idioma: `supportedLocales: [""]` + `fallbackLocale: ""` con `i18n.properties` sin sufijo (elegida tras comparar con `i18n_es.properties` + `["es"]`, a pedido del usuario) | R13, D11, regla 16 | Con `["es"]`, Fiori tools seguiría escribiendo textos nuevos en `i18n.properties`, que UI5 ya no cargaría: claves sin traducir sin aviso. Si la app necesitara varios idiomas, D33 se invierte. |
| D36 | `sap.fiori.archeType: "transactional"` se deja aunque la app sea de solo lectura | R2, R9 | Cambiándolo a `analytical` no cambia nada en pantalla y la app quedaría distinta de lo que generan las herramientas; se revisa si un launchpad filtrara por este valor (Etapa 5). |

Decisiones del usuario en esta etapa: D20, D21, D22, D23, D24, D25, D26, D27, D30, D31, D32, D34, D35, D37, y el cambio de plan que adelantó a esta etapa las anotaciones y R11. Detalle completo, con "si fuera al revés", en `SPEC.md` → Decisiones.

**Reglas nuevas en esta etapa:** R12 (importes con sus decimales completos, hallazgo del usuario: 423 USD en vez de 422.94) y R13 (la app siempre en español).

**Mutaciones adicionales** (manuales, en copia temporal o restauradas; D3 limita la mutación obligatoria a R2/R3):
- R7: mock desactivado (7/8 fallan), condición sin `ConnectionId` (4/8), `_FlightCAP as _Flight` en `srv/` (3/3 tests de delegación de D26), D26 con `NODE_ENV=development` (falla "el mock no se activa").
- R11: mutación rápida detectada. R12: sin la anotación de `Price` (2/4 fallan). R13: `lang="en"`, sin `fallbackLocale`, `i18n_en.properties` agregado (las tres detectadas). D35: un error de lint a propósito hace fallar `npm test`.

**Correcciones durante la etapa** (no son decisiones, pero cambiaron lo hecho):
- El mock perdía `$count` en la navegación: `SELECT.count` no es enumerable y `Object.assign` no lo copiaba.
- El mock no se activaba en los tests porque el test lo importaba antes de que CAP levantara el servicio (caché de ESM): la activación pasó a una función explícita que llama `test/mocked.js`.
- La aserción de D26 sobre `$expand=_Flight` también aceptaba `_FlightCAP`: se ajustó la expresión.
- La aserción nueva de R5 "el build no contiene el mock" detectó que `test/` viajaba compilado al build → D30, adelantado de la Etapa 5.
- El lint de la app no solo avisaba por TypeScript 7: se caía → D35.

**Pendientes para próximas etapas** (también anotados en cada etapa):
- **Etapa 4:** revisar la tabla de semántica y cerrar los "por definir" (medidas / totales, orden) · value help de aeropuertos (el F4 no responde, R8 paso 6) · ¿quitar la columna 8 "Medida"? (D23) · campos con etiqueta en inglés desde el RAP (D24) · decidir drilldown hasta Vuelos · ejecutar R9 (incluye 7b, 422,94 USD).
- **Etapa 5:** R7 desplegado contra el RAP real (D26 no cubre el join del RAP) · R13 en Work Zone / Launchpad (D34) · versión y origen de UI5 (hoy CDN 1.154.0 en `index.html`) · `archeType` si el launchpad lo usa (D36) · verificar con XSUAA el 401 traducido · artefactos HANA (`cds.outbox.Messages`) sin base de datos propia · los tests de R4/R5 usan el `cds` de cds-dk global (tenerlo en cuenta en CI).
- **Etapa 7 (plantilla):** cada app nueva necesita el `backend` del proxy en `ui5.yaml` (D21), `annotations.cds` desde la tabla de semántica (D22), `fallbackLocale` / `data-sap-ui-language` (D33, D34), `typescript ~6.0` (D35) y, si el servicio tiene asociaciones, el mock de su condición (D25).

## Etapa 4 — Presentación del reporte ✅
Rama: `etapa-4-presentacion`
- [x] Revisar con el usuario la tabla **Semántica del reporte** de `SPEC.md` y cerrar los "por definir" (medidas / totales, orden de columnas) → sin "por definir" (D38–D41, D47). Textos propuestos por Claude (D44 y los de los totales, D47) **revisados y aprobados por el usuario en la app (2026-11-10)**
- [x] Generar o ajustar `app/conexiones/annotations.cds` a partir de la tabla (D8). **Adelantado en la Etapa 3 (D22–D24):** ya existe; ajustado en esta etapa con cada cambio de la tabla (D39, D40, D44, D47, D50), verificado por R11
- [x] Si hay totales: confirmar `$apply` en mock y probar la tabla con sumatorias. **Hecho la parte de servicio (2026-11-10, D43):** CAP no delega `$apply` → las lecturas con `$apply` se reenvían tal cual al RAP; mock con `cds.odata.parse`; guarda de `@restrict` por filas; RAP simulado compartido en `test/rap-simulado.ts`. Tests `d43-totales` y `d43-totales-produccion` (directo, `$batch`, `_Flight`, `filter`, `groupby`, 50.000 filas: 1 petición / 57 bytes). Mutaciones detectadas (3). Anotaciones de Fiori hechas (D46 paso 1: `ApplySupported`, `CustomAggregate`, `Measure`, `AnalyticalTable`). Mock y RAP simulado alineados con el Gateway real (rechazan `concat` y alias igual al campo; el mock simula los agregados predefinidos de D45). ~~Falta: paso 2 (capturar en DevTools las peticiones de Fiori) → división de `concat` (D46)~~ **Paso 2 hecho por el usuario en el RAP real (2026-11-10):** el Gateway rechaza `$count` en `$apply` y `top` → **D47: totales en la cabecera del detalle** (R14); D46 queda como alternativa documentada
  - [x] Paso 1 — Registro: resultados en "Análisis del servicio origen", R14, D47, D46 como alternativa, lección en `CLAUDE.md`; `cds import --force` de `ZMAKS_SB_CONEXIONES` (trae `CustomAggregate` de D45). Los `.edmx` de aeropuertos no se importan tal cual (`SAP__ParentService`): pasan al ítem del value help
  - [x] Paso 2 — Semántica (filas `TotalAsientosOcupados`/`TotalCapacidad`, cabecera 3 y 4), `virtual` en `srv/service.cds`, `DataPoint` + `HeaderFacets` en `annotations.cds`, `ResponsiveTable` en vuelos, R11 (sin `@Analytics.Measure` ni `ApplySupported`). Se mantienen `CustomAggregate` + `@Aggregation.default` en Vuelos: sin ellos CAP no entiende `aggregate(SeatsOccupied)` y fallan los 11 tests de D43. Mutaciones de R11 detectadas: `AnalyticalTable` y `ApplySupported`
  - [x] Paso 3 — Elementos `virtual` + cálculo en el handler (una petición `filter/groupby/aggregate`; listas largas repartidas, D48) + tests R14 (`r14-totales`, 8 con mock; `r14-totales-produccion`, 6 con RAP simulado) y mutaciones manuales: detectadas 3 (sin vuelos → `null`, una petición por conexión, `SeatsMax` ↔ `SeatsOccupied`); 2 no detectadas revelaron código muerto (quitar `virtual`, agregar claves) → eliminado (D48)
  - [x] Paso 4 — `PRUEBAS_MANUALES.md`: pasos de R14 (AA 0017 = 573 / 770, LH 0400 = 314 / 330, LH 0402 = 0 / 0); R9 paso 8 (drilldown al vuelo, D41), paso 10 → R14 y 10b exportación (D41). **Ejecución: pendiente del usuario**
- [x] Resolver el value help de aeropuertos → **hecho (2026-11-10, D49–D51):** copia limpia del `.edmx` con `scripts/limpiar-edmx-f4.ts` + `cds import`; entidad `Aeropuertos` (`@readonly`, R1 = tres entidades); `@Common.ValueList` propio en `AirportFromId`/`AirportToId`, sin los `ValueListReferences` del RAP; ruta del F4 con `;ps=…;va=…` (prueba b del usuario en `GW_CLIENT`); `$search` delegado (no probado en el RAP: paso manual R8 6b). Tests: R1–R6 y R11 ampliados, `d50-aeropuertos-produccion` (ruta, `$search`, `$batch`). Mutación R2/R3 2/2 (R2 cubre Aeropuertos); mutaciones manuales del value help 4/4 detectadas (sin anular `ValueListReferences`, `CollectionPath` equivocado, `Aeropuertos` sin delegar al F4, ruta sin `;ps=…;va=…`)
- [x] Test R11: anotaciones efectivas = tabla de semántica. **Hecho en la Etapa 3** (adelantado, D22); se actualiza si cambia la tabla
- [x] Decidir drilldown (sí/no, hasta qué nivel) en `manifest.json` → **se mantiene** Conexión → detalle → Vuelo (D41); sin cambios en `manifest.json`. Verificación: R9 pasos 5–9
- [x] Opcional: exportar a Excel, variantes, tabla responsive vs grid. **D41:** exportación explícita en las dos tablas; tabla de vuelos `ResponsiveTable` (D47, ya no `AnalyticalTable`). Verificado por el usuario en el navegador (R9 paso 10b ✔, columnas en español). Variantes: sin cambios (`variantManagement: "Page"` del generador)
- [x] Actualizar y ejecutar `test/PRUEBAS_MANUALES.md` (R8, R9, R14), registrando el resultado → **ejecutado (2026-11-10):** R8 ✔ (1, 6, 6c, 6d), R9 ✔ (1, 3, 8, 10b), R14 ✔ (1, 4, 5) por el usuario; R13 paso 5 ✔ por configuración (Claude). R8 6b ✖ → corregido con D52, pendiente repetir. Pasos no reportados de R9 y R14, marcados en cada registro
- [x] **Pendiente (de Etapa 3, D23):** decidir si se quita la columna 8 "Medida" (`DistanceUnit`), ya que la unidad se ve junto a la distancia → **quitada de la lista y del detalle (D39)**
- [x] **Pendiente (de Etapa 3, D24):** campos fuera de la tabla de semántica con etiqueta en inglés desde el RAP (`CarrierId_Text` "Airline Name", `CurrencyCode` "Currency Code", …): decidir si se agregan a la tabla para traducirlos (D11) → **traducidos todos: etiquetas, `Heading` y `QuickInfo`; tabla completa verificada por R11 (D40, D44)**
- [x] **Pendiente (de Etapa 2):** avisos del build `SAP__UI.* is not a known vocabulary type` (vienen de `srv/external`, generado — no editar): evaluar si afectan las anotaciones efectivas. **Evaluado en la Etapa 3 (D22):** `cds compile` del servicio da 0 avisos y R11 exige que el `$metadata` de `ReporteService` no tenga ningún `SAP__UI.`; `cds build --production` sigue mostrando los 34 avisos porque compila también `srv/external`. No afectan; se aceptan

Salida: el reporte se ve y navega como dice la tabla de semántica, con datos mock; R11 en verde.

### Decisiones de la etapa
- D8 — Tabla "Semántica del reporte" como fuente de verdad de las anotaciones (decisión del usuario, tomada antes de iniciar la etapa).
- D38 — Totales: `SUM` de `SeatsOccupied` y `SeatsMax` en Vuelos; `Price` y `Distance` sin total. Laboratorio del patrón de totales. Decisión del usuario.
- D39 — Se quita "Medida" de la lista y del detalle. Decisión del usuario.
- D40 — Traducir todo (etiquetas, `Heading`, `QuickInfo`) con columnas "Encabezado" y "Ayuda" en la tabla de semántica y la tabla completa; R11 lo verifica. Decisión del usuario.
- D41 — Exportar a Excel; tipo de tabla según los totales; drilldown y orden se mantienen. Decisión del usuario.
- D42 — Value help: importar `/dmo/i_airport_stdvh`. Decisión del usuario (opción a).
- D43 — Totales: reenviar al RAP las lecturas con `$apply` (no pasan por la delegación CQN), con test que vigila `@restrict` por filas. Decisión del usuario (opción a).
- D44 — Textos en español de Encabezado y Ayuda (y etiquetas nuevas) propuestos por Claude, en la tabla de semántica para revisión. Propuesta propia.
- D45 — Cambio en el RAP: `@Aggregation.default: #SUM` en `SeatsOccupied` y `SeatsMax` (semántica analítica del backend, excepción razonada a D8). Transportar antes de desplegar (Etapa 5). Decisión del usuario.
- D46 — Totales en Fiori: `AnalyticalTable` + dividir `concat` en el handler (desactivable por `cds.env`), decidido con las peticiones reales de Fiori; si son complejas, volver a la opción de totales en la cabecera. Paso 1 hecho (anotaciones, `manifest`, R11). Decisión del usuario (opción 1, con condiciones). **Reemplazada por D47** (alternativa documentada para Gateways con `concat`/`top`/`$count`).
- D47 — Totales en la cabecera del detalle (opción 2): `virtual` en `Conexiones` + una petición `groupby/aggregate` desde el handler; sin vuelos → 0; tabla de vuelos responsive. Decisión del usuario (2026-11-10), tras las pruebas A/B/C en el RAP real. Detalle propio (paso 2): en Vuelos se quitan solo `ApplySupported` y `@Analytics.Measure`; se mantienen los agregados predefinidos que necesita el reenvío D43. Textos de los campos nuevos (Encabezado/Ayuda) propuestos por Claude.
- D48 — R14: listas largas con totales repartidas en varias peticiones GET de hasta `max_get_url_length` (el detalle sigue con una); totales también sin `$select`; no se quitan los `virtual` ni se agregan claves (CAP ya lo hace). Propuesta propia (aprobación general de la Etapa 4).
- D49 — F4 de aeropuertos importado desde una copia del `.edmx` sin `SAP__ParentService` (`scripts/limpiar-edmx-f4.ts`); el `.cds` generado no se edita. Decisión del usuario.
- D50 — Tercera entidad `Aeropuertos` (`@readonly`, R3) + `@Common.ValueList` propio en `AirportFromId`/`AirportToId`; se anulan los `ValueListReferences` del RAP; R1 = tres entidades. Decisión del usuario (R1); anotaciones propias.
- D51 — Ruta del F4 con `;ps=…;va=…airportfromid` también para destino; `$search` delegado sin probar en el RAP (paso manual); sin `I_CountryVH`; `MIA` en `test/data`. Propuesta propia (aprobación general de la Etapa 4).
- D52 — `SearchSupported: true` en el `@Common.ValueList` de los dos aeropuertos (R8 6b ✖: la búsqueda del diálogo no filtraba; el servicio sí resolvía `$search`). R11 lo exige; mutación detectada. Sin verificar aún en el navegador. Propuesta propia, autorizada por el usuario.

### Informe de cierre — Etapa 4 (2026-11-10)

**Resultado:** `npm test` **164/164** en verde (incluye lint, R1–R14, regla 17, D43, D50); `npm run test:mutacion` **2/2** mutaciones detectadas (R2, R3; R2 cubre también `Aeropuertos`); `npx tsc --noEmit -p tsconfig.test.json` sin errores. Pruebas manuales, ejecutadas por el usuario con datos mock: R8 ✔ (pasos 1, 6, 6c, 6d: F4 de salida y destino) y **✖ 6b** (la búsqueda del diálogo no filtraba → corregido con D52, pendiente repetir 6b), R9 ✔ (1, 3, 8, 10b: sin "Medida", drilldown al vuelo, Excel en español), R14 ✔ (1, 4, 5: 573 / 770, 314 / 330, 0 / 0). R13 paso 5 ✔ **por configuración**, verificado por Claude en el `manifest.json` servido (sin captura de la pestaña Red: el Dev Space no puede ejecutar Chromium). Textos de D44 y D47 revisados y aprobados por el usuario en la app. **Pasos no reportados** (en cada registro de `PRUEBAS_MANUALES.md`): R9 2, 4, 4b, 5–7b, 9, 11 y R14 2, 3, 6. Salida de la etapa cumplida: el reporte se ve y navega como dice la tabla de semántica, con datos mock; R11 en verde. Rama `etapa-4-presentacion` con un commit por paso; **sin merge a `main`** (pendiente de revisión del usuario).

**Decisiones tomadas por mi cuenta** (propuestas por Claude, con la aprobación general del usuario para la Etapa 4):

| ID | Decisión | Regla que afecta | Qué pasaría si fuera al revés |
|---|---|---|---|
| D44 | Textos en español de Encabezado y Ayuda (y etiquetas nuevas, p. ej. "Aerolínea", "Moneda") propuestos por Claude, en la tabla de semántica para revisión. **Aprobados por el usuario en la app.** | D40, R11, regla 16 | Copiando la etiqueta como encabezado y ayuda, los tooltips no agregarían información; traduciendo literalmente el inglés del RAP, saldría un texto técnico del modelo de demo ("Flight Reference Scenario: …"). |
| D47 (detalle) | Al pasar a totales en la cabecera, en `Vuelos` se quitan solo `ApplySupported` y `@Analytics.Measure`; se **mantienen** `CustomAggregate` + `@Aggregation.default: #SUM`. Textos de los dos totales propuestos por Claude (aprobados por el usuario). | R14, R11, D43 | Quitando también los agregados predefinidos, CAP no entendería `aggregate(SeatsOccupied)` en el reenvío de D43 (fallan 11 tests); dejando `ApplySupported`/`Measure`, Fiori activaría la analítica que el Gateway no soporta. |
| D48 | Listas largas con totales repartidas en varias GET de hasta `max_get_url_length` (el detalle sigue con una); totales también sin `$select`; no se quitan los `virtual` ni se agregan claves (CAP ya lo hace: era código muerto). | R14, D47, D43 | Con una sola petición siempre, una URL > 1028 caracteres iría en `$batch` (no probado contra este Gateway) o sería rechazada; sin totales sin `$select`, `GET Conexiones(...)` daría `null`; manteniendo el código muerto, las mutaciones no lo vigilarían. |
| D50 (detalle) | Anotaciones del F4: `@Common.ValueList` propio en `AirportFromId`/`AirportToId` sobre `Aeropuertos` y anulación de los `ValueListReferences` del RAP (la tercera entidad la decidió el usuario). | R8, R11, D22 | Dejando los `ValueListReferences`, Fiori intentaría leer un `$metadata` que CAP no publica y el F4 no respondería (como en la Etapa 3). |
| D51 | Ruta del F4 con `;ps=…;va=…airportfromid` también para destino; `$search` delegado al RAP sin probarlo allí; sin `I_CountryVH`; `MIA` (sin conexiones) en `test/data`. | R8, R4, D50 | Con `va=…airporttoid` habría dos servicios remotos iguales; si el RAP no acepta `$search`, la búsqueda del diálogo daría error (traducir a `$filter` en el handler); exponiendo `I_CountryVH`, una cuarta entidad que nadie pidió. |
| D52 | `SearchSupported: true` en el `@Common.ValueList` de `AirportFromId`/`AirportToId` (hallazgo del usuario, R8 6b ✖); R11 lo exige. Autorizada por el usuario. | R8, R11, D50 | Sin él, la búsqueda del diálogo no filtra (con todos los aeropuertos del RAP real, el F4 sería casi inusable); si el RAP no aceptara `$search`, con él la búsqueda daría error (traducir a `$filter`, Etapa 5). |

Decisiones del usuario en esta etapa: D8 (antes de iniciarla), D38, D39, D40, D41, D42, D43, D45, D46 (reemplazada por D47), D47, D49, D50 (R1 a tres entidades). Detalle completo, con "si fuera al revés", en `SPEC.md` → Decisiones.

**Reglas nuevas o cambiadas en esta etapa:** R14 (totales en la cabecera del detalle, una petición al RAP); R1 pasa a tres entidades (`Aeropuertos`, D50); R11 se amplía a la tabla completa de cada entidad (D40) y a los totales.

**Mutaciones adicionales** (manuales, en copia temporal o restauradas; D3 limita la obligatoria a R2/R3):
- D43: sin reenvío de `$apply` (5 fallan), `req.http.req` en vez de `req.req.url` (falla `$batch`), `@restrict` con `where` (falla la guarda).
- R11: `AnalyticalTable` y `ApplySupported` de vuelta en Vuelos, detectadas.
- R14: 3 detectadas (sin vuelos → `null`, una petición por conexión, `SeatsMax` ↔ `SeatsOccupied`); 2 no detectadas revelaron código muerto, eliminado (D48).
- Value help: 4/4 detectadas (sin anular `ValueListReferences`, `CollectionPath` equivocado, `Aeropuertos` sin delegar al F4, ruta sin `;ps=…;va=…`). D52: sin `SearchSupported` → falla R11 (39/40).

**Hallazgos y correcciones durante la etapa** (no son decisiones, pero cambiaron lo hecho):
- CAP no delega `$apply` al remoto (descarta `aggregate`, 500 con `groupby`) y en el mock pierde los alias de agregado → D43 (lección en `CLAUDE.md`).
- Dentro de `$batch`, `req.http.req` es el sobre: se usa `req.req.url`.
- El adaptador OData de CAP ya separa `concat` en una lectura por rama, pero con la URL completa.
- El Gateway real rechaza `concat`, `top`, `$count` en `$apply` y el alias igual al campo → la `AnalyticalTable` no es viable (D46 → D47); mock y RAP simulado alineados con el Gateway.
- El `.edmx` del F4 no se importa tal cual (`SAP__ParentService`) → D49; la ruta del F4 necesita `;ps=…;va=…` (prueba del usuario en `GW_CLIENT`, D51).
- R8 6b ✖ (usuario): un `@Common.ValueList` propio necesita `SearchSupported: true` para que Fiori mande la búsqueda del diálogo como `$search` → D52.

**Pendientes para próximas etapas** (también anotados en cada etapa):
- **Etapa 5:** transportar el cambio del RAP `@Aggregation.default: #SUM` (D45) **antes** de desplegar · probar contra el RAP real: R14 (totales), el reenvío de `$apply` (D43), el F4 de aeropuertos con su ruta `;ps=…;va=…` y el `$search` del diálogo (R8 6b: repetir primero con mock tras D52; en el RAP, probar `$search` en `/IWFND/GW_CLIENT`, D51), R7 · R13 en Work Zone / Launchpad y captura de red del paso 5 · los demás pendientes ya listados en la Etapa 5.
- **Etapa 7 (plantilla):** patrón de totales (D43 reenvío + D47 cabecera; D46 como alternativa para Gateways con `concat`/`top`/`$count`), pregunta inicial sobre `$apply` en el Gateway, `scripts/limpiar-edmx-f4.ts` y el procedimiento de F4 (D49–D51), tabla de semántica completa con Encabezado y Ayuda (D40).

## Etapa 5 — Despliegue a Cloud Foundry ✅
Rama: `etapa-5-despliegue`
- [x] **Paso 1** `mta.yaml` (+ `xsuaa`, `destination`, `connectivity`; managed app router, D54) **Hecho (2026-11-11):** escritos a mano tomando `etiquetas` como referencia, sin módulo de base de datos; script `npm run build` (= `cds build --production`); `@sap/xssec` como dependencia y `auth` `xsuaa` en `[production]`
- [x] Roles en `xs-security.json` coherentes con `@requires` / `@restrict`. **Hecho (2026-11-11, D53):** `@requires: 'Visualizador'`, role collection `ReporteSimple_Visualizador`; usuarios mock `alice` (con el rol) y `sinrol` (sin él); R3 con 403 sin rol; test `d53-roles` (mutación manual detectada: scope renombrado en `xs-security.json`, 4/5 fallan); `npm run test:mutacion` 2/2; `npm test` 173/173
- [x] Reutilizar o crear instancias `destination` / `connectivity` (lite). **Hecho (2026-11-11, D55):** nuevas `reporte-simple-*`; la cuota alcanzó
- [x] **Paso 2** Configuración de despliegue de la app Fiori (HTML5 repo). **Hecho (2026-11-11, D54, D59):** `app/conexiones/xs-app.json` (ruta `^/odata/` → destination `reporte-simple-srv-api`), `ui5-deploy.yaml` + `ui5-task-zipper` + script `build:cf` (zip de 10 archivos con `xs-app.json`), `sap.cloud` e inbound `ReporteConexiones-display` en `manifest.json`, módulos html5 / app-content / destination-content en `mta.yaml`; `dist/` y `resources/` en `.gitignore`. Test `d54-despliegue` (8 tests; 3 mutaciones manuales detectadas)
- [x] **(de Etapa 3)** Resuelto con D58 (Work Zone usa su UI5; `index.html` solo local / URL directa). Texto original: `index.html` carga UI5 1.154.0 desde el CDN (`sapui5.hana.ondemand.com`): decidir la versión y el origen de UI5 para el despliegue (app router / HTML5 repo, o Work Zone, que usa su propio UI5)
- [ ] **Paso 6 — postergado por el usuario (2026-11-11); pasa a los pendientes (la etapa se cierra sin él, a pedido del usuario).** R13 desplegado (D34): si la app se publica en Work Zone / Launchpad, verificar con el launchpad en inglés qué textos y formatos salen en español (los de la app sí, por D33; los de Fiori y el formato dependen del idioma del launchpad) y decidir si hace falta fijarlo ahí
- [x] **Paso 3** **Hecho (2026-11-11, D60):** `gen/srv` compilado (`service.js`, `server.js`, `@cds-models`, sin `.ts` ni `test/`), `npm ci --omit=dev` en una copia, arranque con `NODE_ENV=production` sin `tsx` (`/health` UP; 401 / 403 / 200). `gen/db` sin usar (no se despliega). Un `cds.build.tasks` explícito deja de compilar el TS: R5 lo detecta (mutación manual). Texto original: Verificar que `cds build --production` compila el TypeScript correctamente sin `tsx` (`gen/srv` con `service.js`, imports `#cds-models` resueltos, sin `.ts` en el runtime) — D13. **Hallazgo 2026-11-09 (Etapa 2):** con `cds build -o <dir>` el build copia `srv/service.ts` sin compilar y no incluye `@cds-models`. Con el destino normal (`gen/`, o `CDS_BUILD_TARGET` **relativo**) sí compila el TS, pero como `tsconfig.json` no tiene `include`, compila **todo** el proyecto: los tests (`test/*.test.js`) terminan en `gen/srv/test/` y viajarían a producción. Con un `CDS_BUILD_TARGET` absoluto, `tsc` escribe dentro del proyecto (`./tmp/...`). ~~Revisar `include` / un `tsconfig` de build.~~ Resuelto en la Etapa 3 (D30). También genera artefactos HANA (`src/gen`, `cds.outbox.Messages`) aunque el reporte no tiene base de datos propia: revisar si hacen falta
- [x] Verificar con XSUAA que el 401 sale por la clave i18n traducida ("No autenticado"). **Resultado (2026-11-11):** no, sale `Unauthorized` de XSUAA → excepción de R10 (D62)
- [ ] Si se agrega CI: los tests de R4/R5 necesitan el `cds` de cds-dk global. **No aplica en esta etapa** (no hay CI); pasa a los pendientes
- [x] ~~**(D45)** Transportar al sistema destino~~ No aplica en esta etapa (D56: mismo `<S4_SISTEMA>` cliente <S4_CLIENTE>, el cambio ya está activo). **Transportar antes de QAS/PRD.** Texto original: Transportar al sistema destino el cambio del RAP `@Aggregation.default: #SUM` en `SeatsOccupied` y `SeatsMax` (CDS de vuelos) antes de desplegar; verificar en el `$metadata` desplegado que `aggregate(SeatsOccupied)` funciona
- [x] **Paso 4** `mbt build` y **pedir aprobación** antes de `cf deploy`. `mbt build` hecho (2026-11-11): `mta_archives/reporte-simple_1.0.0.mtar` (61 KB; `gen/srv` sin `node_modules`, sin tests ni CSV; app `conexiones.zip`). **Desplegado (2026-11-11, aprobado por el usuario):** cuota suficiente (400 instancias / 5 en uso, 4096 MB / 0, 10 rutas / 1), instancias nuevas `reporte-simple-*` (D55 sin cambios); `/health` UP, 401 sin token. Hallazgos: memoria 250,5/256 MB → 512 MB (D61; redeploy aprobado y hecho: 81,7/512 MB); el 401 de XSUAA dice `Unauthorized` → excepción de R10 (D62)
- [x] **Paso 5** Probar `/odata/v4/reporte/Conexiones` desplegado → datos **reales** del RAP. **Hecho (2026-11-11, usuario):** datos reales de `<S4_SISTEMA>` en la app; 403 sin el rol y 200 con `ReporteSimple_Visualizador` (R3, D53); F4 `Frankfurt` ✔ (R8 6b, D52); precio con decimales ✔ (R12 / R13). Registro en `PRUEBAS_MANUALES.md` → "Despliegue"
- [x] R7 desplegado. **Hecho (2026-11-11, usuario):** `AA 0015` muestra sus 2 vuelos (260 / 260; 213 / 137) y R14 en la cabecera da Capacidad 520 · Asientos ocupados 350 (= tabla y `GW_CLIENT`). La app usa `Conexiones(...)/_Flight` (visto en los logs); `$expand=_Flight` no lo pide la app y no se probó desplegado (lo cubre D26 con el RAP simulado). Texto original: `Conexiones(...)/_Flight`, `$expand=_Flight` y la sección "Detalles de vuelos" contra el RAP real (la condición ya está confirmada en ADT; aquí se verifica que el RAP la aplique). D26 no cubre el join del RAP
- [x] ~~Confirmar en Cloud Connector → Monitor que llegan las peticiones~~ Confirmado en los logs de `reporte-simple-srv` (D63): 12 llamadas al RAP por la destination OnPremise, `$batch` 200, sin errores

Salida: la app desplegada muestra datos reales de `<S4_SISTEMA>`, cliente <S4_CLIENTE>.

### Decisiones de la etapa
- Plan de 6 pasos aprobado por el usuario de una vez (2026-11-11): 1) `mta.yaml` + `xs-security.json` · 2) despliegue de la app (HTML5 repo, UI5) · 3) `cds build --production` · 4) `mbt build` → aprobación → `cf deploy` · 5) pruebas contra el RAP real · 6) R13 en Work Zone. Commit por paso; Claude se detiene solo para `cf login`, la aprobación del `cf deploy` o pruebas del usuario (todo junto).
- D53 — Rol `Visualizador` (`@requires: 'Visualizador'`); R3: sin usuario 401, sin rol 403. Decisión del usuario.
- D54 — Managed app router (Work Zone / HTML5 repo), como `etiquetas`. Decisión del usuario.
- D55 — Instancias nuevas `reporte-simple-*`; si la cuota del Trial no alcanza, reusar las de `etiquetas` y registrarlo. Decisión del usuario.
- D56 — Mismo `<S4_SISTEMA>` cliente <S4_CLIENTE>: sin transporte de D45 ahora; transportarlo antes de QAS/PRD. Decisión del usuario.
- D57 — `ESTADO.md` en el repo, actualizado al terminar cada paso. Decisión del usuario.
- D58 — UI5 en producción: el de Work Zone; `index.html` (CDN 1.154.0) solo local / URL directa. Propuesta propia.
- D61 — `reporte-simple-srv` a 512 MB (250,5/256 MB en reposo); redeploy aprobado y hecho (81,7/512 MB). Propuesta propia, aprobada.
- D62 — El 401 `Unauthorized` de XSUAA es excepción de R10, como D17. Decisión del usuario (opción a).
- Cambio de plan (usuario, 2026-11-11): el paso 6 (Work Zone, R13) se deja para después.
- D60 — Build con las tareas por defecto; `gen/db` se genera pero no se despliega; R5 verifica el TS compilado. Propuesta propia.
- D59 — `sap.cloud.service: reportesimple`, inbound `ReporteConexiones-display`, zip `conexiones.zip`; test `d54-despliegue`. Propuesta propia.
- D63 — Llamadas al RAP confirmadas en los logs de la app en vez del Cloud Connector Monitor (no revisado por el usuario). Propuesta propia. La URL exacta al S/4 se confirma una vez con el Monitor o `DEBUG=remote` (paso 7b de "Despliegue", pedido del usuario).
- Revisión del usuario (2026-11-11): **D58–D63 aprobadas**; R7 se ajusta a la navegación `/_Flight` y `$expand=_Flight` queda fuera de alcance.
- D64 — `$expand=_Flight` fuera de R7; sus tests se mantienen como regresión, marcados como fuera de R7. Ajuste de R7 del usuario; mantener los tests, propuesta propia.

### Informe de cierre — Etapa 5 (2026-11-11)

**Resultado:** `npm test` **182/182** en verde (incluye lint, R1–R14, regla 17, D43, D50 y los nuevos `d53-roles` y `d54-despliegue`); `npm run test:mutacion` **2/2** (R2, R3 con el rol `Visualizador`); `npx tsc --noEmit -p tsconfig.test.json` sin errores. **Desplegado** en `<CF_ORG> / dev` con aprobación del usuario (deploy inicial + redeploy a 512 MB): instancias nuevas `reporte-simple-uaa`, `-destination`, `-connectivity`, `-html5-host`; app `reporte-simple-srv` (81,7 / 512 MB); app Fiori en el HTML5 repo por el managed app router. Pruebas en el despliegue (usuario, datos reales de `<S4_SISTEMA>`): 403 sin rol ✔, datos reales ✔, R7 + R14 en `AA 0015` (2 vuelos; 520 · 350) ✔, F4 `Frankfurt` ✔, precio con decimales ✔. Claude: `/health` UP, 401 sin token, llamadas al RAP en los logs (D63). Salida de la etapa cumplida: la app desplegada muestra datos reales de `<S4_SISTEMA>`, cliente <S4_CLIENTE>. **Excepción:** el paso 6 (R13 en Work Zone) queda postergado por el usuario. Rama `etapa-5-despliegue` con un commit por paso; **sin merge a `main`** (pendiente de revisión del usuario).

**Decisiones tomadas por mi cuenta** (propuestas por Claude, dentro del plan aprobado por el usuario; **D58–D63 aprobadas por el usuario en la revisión del 2026-11-11**):

| ID | Decisión | Regla que afecta | Qué pasaría si fuera al revés |
|---|---|---|---|
| D58 | UI5 en producción: el que carga Work Zone; `index.html` (CDN 1.154.0) solo para local y la URL directa del HTML5 repo; `minUI5Version` 1.154.0 | R13, D34 | Con un bootstrap propio versionado habría que mantener la versión a mano y podría diferir del launchpad; sin `index.html` no se podría abrir la app fuera de Work Zone para diagnosticar (como se hizo en esta etapa). |
| D59 | `sap.cloud.service: reportesimple`, inbound `ReporteConexiones-display`, zip `conexiones.zip`; test `d54-despliegue` que cruza `mta.yaml`, `xs-app.json`, `manifest.json` y `ui5-deploy.yaml` | D54, reglas técnicas 13 y 17 | Un nombre distinto entre esos archivos no lo detecta `mbt build`: Work Zone no encontraría la app o el servicio daría 404, recién desplegado. |
| D60 | Build con las tareas por defecto (`gen/db` se genera pero no se despliega); R5 verifica que `srv/` viaje compilado | D13, D30, R5 | Con `cds.build.tasks: [{ for: 'nodejs' }]` (para quitar `gen/db`), `service.ts` viajaría sin compilar y el servicio no arrancaría en Cloud Foundry (comprobado). |
| D61 | `reporte-simple-srv` con 512 MB (con 256 MB quedó en 250,5 MB) | Proceso 5 (redeploy aprobado) | Con 256 MB, riesgo de reinicios por memoria con carga real. Ahora usa 81,7 MB: si se quisiera ahorrar cuota, 256 MB podría bastar, pero sin margen confirmado. |
| D63 | Llamadas al RAP confirmadas en los logs de la app en vez del Cloud Connector Monitor | R4, R5 | Exigiendo el Monitor, la etapa esperaría un acceso que no agrega evidencia (los datos reales ya pasaron por el Cloud Connector); los logs no muestran la URL exacta que llega al S/4 (se confirma una vez, paso 7b). |
| D64 (en la revisión) | `$expand=_Flight` fuera de R7 (decisión del usuario); sus tests se mantienen como regresión (propuesta propia) | R7, D25, D26 | Borrándolos, una regresión de `$expand` en el mock o en la delegación pasaría inadvertida si una app futura lo usara. |

Decisiones del usuario en esta etapa: aprobación del plan de 6 pasos de una vez, D53 (rol `Visualizador`), D54 (managed app router), D55 (instancias nuevas; la cuota alcanzó), D56 (sin transporte de D45 por ahora; **transportar antes de QAS/PRD**), D57 (`ESTADO.md`), D62 (401 de XSUAA como excepción de R10), aprobación de los dos `cf deploy` y la postergación del paso 6. Detalle completo, con "si fuera al revés", en `SPEC.md` → Decisiones.

**Reglas cambiadas en esta etapa:** R7 se limita a la navegación `/_Flight`, la que usa la app; `$expand=_Flight` queda fuera de alcance (revisión del usuario, D64). R3 pasa de `authenticated-user` a rol `Visualizador` (sin usuario 401, sin rol 403; D53). R10 suma una excepción: el 401 de XSUAA (D62).

**Mutaciones** (D3: la obligatoria es R2/R3):
- `npm run test:mutacion`: R3 (quitar `@requires: 'Visualizador'`) y R2 detectadas, 2/2.
- Manuales, restauradas: `d53-roles` con el scope renombrado en `xs-security.json` (4/5 fallan); `d54-despliegue` con destination distinta en `xs-app.json`, `sap.cloud.service` distinto y zip con otro nombre (1 falla cada una); R5 con `cds.build.tasks` explícito (falla "srv/ viaja compilado").

**Hallazgos y correcciones durante la etapa** (no son decisiones, pero cambiaron lo hecho):
- Un `cds.build.tasks` explícito desactiva la compilación de TypeScript del build (D60).
- La memoria del primer deploy (250,5 / 256 MB) era el límite del contenedor, no el consumo: con 512 MB usa 81,7 MB (D61).
- El 401 sin token lo responde XSUAA en inglés, antes de CAP (D62).
- `cf login --sso` no funciona con `!` (no puede leer el código): usar `cf login --sso-passcode <código>`.

**Pendientes para próximas etapas:**
- **Paso 6 postergado:** R13 en Work Zone / Launchpad (D34) y `archeType` si el launchpad lo usa (D36): publicar la app (intent `ReporteConexiones-display`) en un sitio y probar con el launchpad en inglés.
- **Antes de QAS/PRD:** transportar el cambio del RAP de D45 (D56).
- **Una vez:** confirmar la URL exacta que llega al S/4 con el Cloud Connector Monitor o `DEBUG=remote` (D63, paso 7b de "Despliegue" en `PRUEBAS_MANUALES.md`).
- **Etapa 6 (seguridad):** el Cloud SDK avisa "basic authentication… Principal propagation is recommended" (destination `S4_BACKEND` con usuario técnico); revisar `npm audit` (avisos en el `npm install` de la etapa).
- Si se agrega CI: los tests de R4/R5 usan el `cds` de cds-dk global.
- **Etapa 7 (plantilla):** cada reporte necesita su `xs-security.json` con un rol propio (D53, test `d53-roles`), sus instancias `<reporte>-*` (D55), `sap.cloud.service` sin guion y coherente (D59, test `d54-despliegue`), 512 MB (D61) y no fijar `cds.build.tasks` (D60).

## Etapa 6 — Seguridad, limpieza y publicación como portafolio
Rama: `etapa-6-limpieza`

> Pedido del usuario (2026-11-11): preparar el repo para publicarlo en GitHub (`github.com/pgj1010/reporte-simple`) como portafolio público. Plan aprobado de una vez, con commit por paso; **sin push** (lo hace el usuario). El usuario confirmó que tiene permiso de la empresa para publicar.

- [x] **Paso 0** Escaneo de secretos en archivos e historial (51 commits, todas las ramas): **ningún secreto**. `.cdsrc-private.json` nunca se versionó. Datos internos encontrados: host, cliente, org y API de CF, URL de la app, destination, email corporativo en los commits.
- [x] **Paso 1** `npm audit`: resolver al menos las 5 altas sin `--force` ni bajar versiones mayores (D66)
- [x] **Paso 2** Marcadores para datos internos (host, cliente, org, API, URL de la app) + sección "Configuración" del README (D67). Hecho: 5 documentos; valores reales en `LOCAL.md` (ignorado); `readme.md` → `README.md` con *Configuración*.
- [x] **Paso 3** Destination genérica `S4_BACKEND` + `.mtaext` no versionado (D65). Hecho: plantilla `deploy/destination.mtaext.ejemplo`, validada con `cds env` y `mbt build -e`; 4 tests nuevos en R5.
- [x] **Paso 4** `README.md` para reclutadores (problema, Mermaid, stack, decisiones, métricas, "Cómo lo construí con Claude Code") + espacios de capturas en `docs/img/`. Hecho: badge de CI; pasos de las capturas en `docs/img/CAPTURAS.md`. **Pendiente del usuario:** tomar las 3 capturas (con mock y `alice`, revisando que no se vean datos reales).
- [x] **Paso 5** `.github/workflows/test.yml` (solo mocks, sin backend SAP) + badge (D68). Hecho: simulado en un clon limpio, 186/186 + `tsc` + mutaciones 2/2; ningún test necesitó backend. Badge en el paso 4.
- [x] **Paso 6** Licencia MIT a nombre de Pablo Gallardo (`LICENSE`; `license`, `author` y `repository` en `package.json`). Topics sugeridos para el repo: `sap-cap`, `cap-nodejs`, `typescript`, `odata-v4`, `fiori-elements`, `sap-btp`, `cloud-foundry`, `s4hana`, `abap-rap`, `clean-core`, `mutation-testing`, `claude-code`, `ai-assisted-development`.
- [x] **Paso 7** Reescritura del historial en un **clon nuevo** (`/home/user/projects/reporte-simple-publico`) con `git filter-repo` 2.47 (instalado por el usuario): los 51 commits de `main` + la Etapa 6 mergeada **solo en el clon** (`--no-ff`); autor y committer noreply en todos; datos internos reemplazados por marcadores en contenido y mensajes; `.cdsrc-private.json`, `default-env.json`, `*.mtaext`, service keys y `LOCAL.md` excluidos de todo el historial (nunca se habían versionado); `user.name`/`user.email` noreply y `origin` = `https://github.com/pgj1010/reporte-simple.git` sin token. Escaneo de **todas las revisiones** del clon: 0 datos internos, 0 secretos con valor, 0 archivos sensibles, un único autor noreply. **Sin push** (lo hace el usuario: solo `main`).
- [x] Revisar `.gitignore`: se suman `LOCAL.md`, `*.mtaext`, `.env*`, `*-key.json`, `*service-key*`, `*.pem`, `*.p12`, `*.pfx`; ningún archivo versionado queda ignorado. En todo el historial nunca se versionaron `.cdsrc-private.json`, `default-env.json`, `*.mtaext` ni service keys.

Pendientes de la etapa que requieren a Cloud Foundry o al Cloud Connector (quedan para el usuario):
- [ ] Regenerar service key de connectivity (`cf delete-service-key ...` + `cds bind`)
- [ ] Deshabilitar SSH en la app del servicio si no se usa (`cf disable-ssh reporte-simple-srv`)
- [ ] Eliminar recurso redundante `/sap/opu/odata4/` del Cloud Connector (opcional)

Salida: sin secretos expuestos; datos internos reemplazados por marcadores; clon con historial reescrito listo para `git push`.

### Decisiones de la etapa
- D65 — Destination genérica `S4_BACKEND`; el nombre real va en `deploy/destination.mtaext` (no versionado) vía `CDS_CONFIG`. Ya creado en este Dev Space con el nombre de `LOCAL.md`: **el próximo `cf deploy` va con `-e deploy/destination.mtaext`**.
- D66 — `npm audit`: `overrides` acotados (`pacote` ^21.5.3, `sigstore` ^4.1.1, `@sigstore/core` ^3.2.1, `glob` 9–14.0.1 → ^14.0.4, `minimatch` 7–11.0.0 → ^11.0.8) en vez del "fix" de npm, que bajaba `cds-plugin-ui5` a 0.13 y `@ui5/cli` a 2. 37 → 0 vulnerabilidades; `npm test`, mutación, `cds watch` con el plugin UI5, `ui5 build` y `cds build --production` verificados.
- D67 — Marcadores para datos internos en la documentación; valores reales en `LOCAL.md` (no versionado); `ZMAKS_*` se mantiene (namespace Z, `srv/external` no editable).
- D68 — CI con GitHub Actions: `npm test`, `tsc` y mutaciones, 100 % con mocks (CSV + RAP simulado en `localhost`), sin secretos.

### Informe de cierre
**Resultado:** `npm test` **186/186** (182 + 4 de D65 en R5); `npm run test:mutacion` **2/2**; `tsc` sin errores; `npm audit` **0** vulnerabilidades; CI simulado en un clon limpio con el mismo resultado.

| Decisión | Regla que afecta | Si fuera al revés |
|---|---|---|
| D65 — destination `S4_BACKEND` + `.mtaext` no versionado | R5, regla técnica 11 | El repo público mostraría la destination del subaccount; o, sin `-e` en el próximo deploy, fallaría la conexión si la destination real no se renombra |
| D66 — `overrides` acotados para `npm audit` | Seguridad de dependencias, D35 | Con `--force` se bajaban de versión mayor `cds-plugin-ui5`, `@ui5/cli` y el lint de Fiori; sin nada, 5 alertas altas en el repo público |
| D67 — marcadores + `LOCAL.md` no versionado; `ZMAKS_*` se mantiene | Reglas de desarrollo, CLAUDE.md → Sistema origen | Con valores reales se expone la red interna; sin `LOCAL.md` las sesiones pierden el contexto; renombrar `ZMAKS_*` obligaba a regenerar `srv/external` |
| D68 — CI solo con mocks | Regla 4, D3, D12 | Un test que necesite el S/4 real fallaría siempre en GitHub |

Decisiones menores sin número: `README.md` en español (como el resto del repo); el paso de SSH ahora apunta a `reporte-simple-srv` (el texto anterior nombraba `etiquetas-srv`, de otro proyecto); en el clon, `main` incluirá el merge de esta etapa para que el repo público tenga README, CI y licencia (el `main` de este repo **no** se toca hasta la revisión del usuario).

**Pendiente del usuario:** `git push -u origin main` desde el clon; tomar las 3 capturas (`docs/img/CAPTURAS.md`); revisar y aprobar el merge de la etapa; pasos de CF y Cloud Connector de la lista de arriba. **Próximo `cf deploy`:** con `-e deploy/destination.mtaext` (D65).

## Etapa 7 — Generalización y plantilla para nuevos reportes
Rama: `etapa-7-plantilla`

> Pedido del usuario: apenas termine esta app, hacer una mejora para que **todo sea genérico** y reutilizable.

- [ ] Crear versiones **plantilla** de `CLAUDE.md`, `SPEC.md` y `PLAN.md` con marcadores (`<REPORTE>`, `<SERVICIO>`, `<DESTINATION>`, `<REGLAS>`), manteniendo fijas las reglas del equipo y las lecciones aprendidas
- [ ] Plantilla de `SPEC.md` con las secciones **"Análisis del servicio origen"** y **"Semántica del reporte"** vacías, listas para llenar
- [ ] Evaluar qué partes del código son genéricas (handler de delegación, test R11 que lee la tabla de semántica, configuración de perfiles) y dejarlas listas para copiar o reutilizar
- [ ] Guardar la plantilla donde el equipo la encuentre (repo de plantillas o proyecto de Claude)
- [ ] **Idea (usuario, 2026-11-10):** generar `annotations.cds` automáticamente a partir de la tabla **Semántica del reporte** de `SPEC.md` (D8, D22), y que el test R11 use la misma lectura de la tabla
- [ ] Probarla con el siguiente reporte real

Receta "nuevo reporte" (D7: siempre proyecto independiente):
1. Crear un **proyecto nuevo en Claude** (p. ej. "Reporte TRM Posiciones") y subir la plantilla
2. Entregar a Claude: servicio (binding / definition o API liberada, V2/V4, `$metadata`), sistema y destination, decisión de clean core, y qué debe mostrar el reporte (columnas, filtros, totales, drilldown, roles)
3. Claude ajusta `CLAUDE.md`, `SPEC.md` y `PLAN.md`
4. En BAS (mismo Dev Space): `cd ~/projects && cds init <reporte> && cd <reporte> && cds add nodejs,typescript`; copiar los 3 documentos a la raíz
5. Confirmar si hay API liberada; si no, documentar el servicio Z en `SPEC.md` (D1)
6. Descargar `$metadata` (V4: `/sap/opu/odata4/sap/<binding>/srvd/sap/<service_def>/0001/$metadata`)
7. `cds import <SERVICIO>.edmx --as cds` + `npm install`
8. Llenar **"Análisis del servicio origen"** en `SPEC.md`: ¿trae `@UI`?, ¿soporta `$apply`?, ¿tiene parámetros?, ¿value helps disponibles?
9. Llenar **"Semántica del reporte"** con el usuario: filtros, obligatorios, columnas y orden, medidas/totales, textos, unidades, value helps
10. Credenciales en `[production]` / `[hybrid]` con la destination y el `path`; `remote.native_fetch: false`
11. Proyecciones `@readonly` + `@requires` en `srv/service.cds`; `READ` delegado en `service.ts`
12. CSV mock `test/data/<SERVICIO>-<Entidad>.csv`
13. Reglas en `SPEC.md` + sus tests (incluido R11 contra la tabla de semántica)
14. Generar app Fiori Elements, rutas relativas, `annotations.cds` a partir de la tabla de semántica

Salida: el siguiente reporte arranca desde la plantilla siguiendo solo la receta.

### Decisiones de la etapa
- _(anotar aquí al tomarlas)_

---

## Bitácora
- 2026-11-09 — Etapas 0 y 1 completas. `hybrid` desde BAS no llega al on‑premise (ni con túnel SSH); plan B: mock local + pruebas reales desplegando.
- 2026-11-09 — Se adoptan las reglas del equipo. Aprobados: TypeScript (D2), mutación solo en R2/R3 (D3), clean core flexible (D1). Nueva Etapa 2 de alineación; la app Fiori pasa a Etapa 3.
- 2026-11-09 — D7: cada reporte será un proyecto CAP independiente con su propio proyecto en Claude. La Etapa 7 pasa a ser "plantilla" en vez de "segundo reporte dentro de este proyecto".
- 2026-11-09 — Etapa 2 iniciada: Git inicializado (commit `dfdccd6` en `main`), rama `etapa-2-alineacion`. CAP no traduce `ENTITY_IS_READ_ONLY` al español → textos propios (D11).
- 2026-11-09 — Etapa 2, paso 3: `tsx` + `cds-plugin-ui5` agota la memoria → TypeScript nativo de Node 24 (D13, reemplaza a D6).
- 2026-11-09 — Criterio del usuario: un commit por paso con `npm test` en verde (regla de proceso 4b de CLAUDE.md).
- 2026-11-09 — Etapa 2, pasos 4 y 5: CSV en `test/data/`; el build de producción no los incluye. El build deja `service.ts` sin compilar (pendiente de Etapa 5). Avisos `SAP__UI.* is not a known vocabulary type` en el build, provenientes de `srv/external` (generado, no se edita): revisar en Etapa 4.
- 2026-11-09 — Etapa 2: tests R1, R2, R4, R6 (43/43). Hallazgo: `cds build` ejecuta `tsc` y falla ante errores de tipos (bueno para la Etapa 5).
- 2026-11-09 — Etapa 2: el test de R5 fallaba de forma intermitente con `cds build -o` (dos tareas escriben el mismo `package.json`). Ahora usa `CDS_BUILD_TARGET=_out/r5-build-<pid>`, el mismo camino que el despliegue.
- 2026-11-09 — **Etapa 2 cerrada** (pendiente de revisión y merge a `main` por el usuario). `npm test` 43/43, mutaciones R2/R3 detectadas (manual y `npm run test:mutacion`). Decisiones D9–D18; D6 reemplazada por D13. Etapa activa: 3.
- 2026-11-09 — D8: tabla "Semántica del reporte" como fuente de verdad de anotaciones (filtros, obligatorios, columnas, medidas, textos, value helps), para servicios que no vienen enriquecidos. Nueva regla R11 y sección "Análisis del servicio origen". Se detecta que el value help de aeropuertos no funciona en CAP (apunta a otro servicio). Etapa 7 se amplía a "generalización" por pedido del usuario.
- 2026-11-10 — Etapa 2 aprobada por el usuario y mergeada a `main` (`--no-ff`); D11 aclarada a "siempre en español". Rama `etapa-3-fiori`.
- 2026-11-10 — Etapa 3, pasos 1 y 2: ruta relativa en `manifest.json` (D19, D20); en local resolvía a `/conexiones/odata/...` (404) → proxy en `ui5.yaml` (D21). Hallazgo del usuario en el navegador: la tabla sale sin columnas (el `@UI.LineItem` del RAP no se aplica) → se adelanta a la Etapa 3.
- 2026-11-10 — Etapa 3: causa de la tabla sin columnas = alias `SAP__UI` del RAP (D22). Anotaciones `@UI` en `annotations.cds` desde la tabla de semántica, R11 adelantado y leyendo `SPEC.md`; D23 (unidad de `Distance`) y D24 (etiquetas = `@Common.Label`). `npm test` 64/64.
- 2026-11-10 — Etapa 3, R7: asociación `_Flight` confirmada por el usuario en ADT (`CarrierId` + `ConnectionId`). Mock solo en `test/` (D25, D29), test de producción en proceso aparte (D26), 5xx en R10 (D27), conexión sin vuelos (D28). Hallazgo: el build de producción incluye `test/` compilado (también el mock) por el `tsconfig.json` sin `include`; la aserción nueva de R5 lo detecta y queda en rojo hasta decidir.
- 2026-11-10 — D30 (usuario, opción a): `include` en `tsconfig.json` + `tsconfig.test.json`; el build ya no lleva `test/`. D28 y D29 aprobadas. `npm test` 82/82.
- 2026-11-10 — R7 verificado en el navegador (AA 0017; LH 0402 sin confirmar). Hallazgo del usuario: `Price` sale sin decimales (423 USD). Causa: `cds import` convierte `Scale="variable"` en `Decimal(16)` (escala 0) y CAP publica `Precision="16"` sin `Scale`. Nueva regla R12; D31 (`@odata.Type`/`Precision`/`Scale: 'variable'`) y D32 (en `srv/service.cds`) aprobadas.
- 2026-11-10 — Verificación del usuario en el navegador: R7 completo (LH 0402 vacía con "Todavía no hay entradas", sin error) y R12 (AA 0017 con decimales). Próximo paso aprobado: idioma de UI5 fijo en español (R13, D33, D34).
- 2026-11-10 — R13: idioma de UI5 fijo en español (D34). D33: se compararon `[""]` sin sufijo y `i18n_es.properties` + `["es"]`; se eligió `[""]` (el tooling ya lo generaba, Fiori tools escribe en `i18n.properties`). El aviso de locales desapareció.
- 2026-11-10 — D35: TS 7 rompía el lint de Fiori tools (se caía, no solo avisaba) → `typescript: "~6.0"`; lint dentro de `npm test` (2,6 s). `npm test` 97/97.
- 2026-11-10 — R8 ejecutado por el usuario (1–5 ✔, F4 sin respuesta como se esperaba); paso 7 eliminado (D37). **Etapa 3 cerrada** (pendiente de revisión y merge a `main` por el usuario). `npm test` 97/97, mutaciones R2/R3 2/2. Decisiones D19–D37. Etapa activa: 4.
- 2026-11-10 — Etapa 3 mergeada a `main` (`21470e6`); rama `etapa-4-presentacion`. Decisiones de semántica del usuario D38–D42. Hallazgo: CAP no delega `$apply` al remoto (descarta `aggregate`, 500 con `groupby`); en el mock se pierden los alias de agregado. Prototipos de totales: (a) reenviar `$apply` al RAP, (b) calcular en el handler.
- 2026-11-10 — D43 implementado: reenvío de `$apply` al RAP (1 petición / 57 bytes con 50.000 filas, frente a 51 peticiones / 11,7 MB calculando en el handler). Hallazgo: en `$batch`, `req.http.req` es el sobre → se usa `req.req.url`. Pendiente: resultados de `/IWFND/GW_CLIENT` para las anotaciones de totales.
- 2026-11-10 — Pruebas del usuario en el RAP real: alias igual al campo → error; `concat` → no implementado; `aggregate(Campo)` OK tras agregar `@Aggregation.default: #SUM` en el RAP (D45, transportar en Etapa 5). Pendiente: re-importar el `$metadata` nuevo y decidir cómo mostrar los totales sin `concat`.
- 2026-11-10 — D46 paso 1: anotaciones de agregación y `AnalyticalTable`; R11 verifica medidas y tipo de tabla. Mock/RAP simulado como el Gateway (sin `concat`, sin alias igual al campo). Hallazgo: el adaptador OData de CAP ya separa el `concat` en una lectura por rama. `npm test` 121/121.
- 2026-11-10 — Etapa 4: totales en la cabecera del detalle (R14, D47, D48) con mutaciones; pasos manuales de R9/R14; value help de aeropuertos con el F4 del RAP (D49–D51, R1 = tres entidades; prueba b del usuario en `GW_CLIENT`). `npm test` 164/164, mutación R2/R3 2/2. **Etapa 4 lista para revisión** (pendiente: pruebas manuales R8, R9, R13 paso 5, R14 y revisión de textos D44/D47; merge a `main` tras la revisión del usuario).
- 2026-11-10 — Pruebas manuales de la Etapa 4 ejecutadas por el usuario: R8 ✔ (F4 de salida y destino), R9 ✔ (sin "Medida", drilldown al vuelo, Excel en español), R14 ✔ (573 / 770, 314 / 330, 0 / 0); textos D44/D47 aprobados. R13 paso 5 ✔ por configuración (Claude; sin navegador en el Dev Space). Pasos no reportados anotados en `PRUEBAS_MANUALES.md` (entre ellos R8 6b, `$search`). **Etapa 4 cerrada** (pendiente de revisión y merge a `main` por el usuario). `npm test` 164/164, mutaciones R2/R3 2/2. Etapa activa: 5 tras el merge.
- 2026-11-10 — R8 6b ✖ (usuario): la búsqueda del diálogo del F4 no filtraba. El servicio sí resolvía `$search`; faltaba `SearchSupported: true` en el `@Common.ValueList` → D52 con R11 y mutación. Pendiente repetir 6b. Pasos no reportados de R9 y R14 quedan así (usuario). **Etapa 4 aprobada por el usuario.**
- 2026-11-11 — Etapa 5: plan de 6 pasos aprobado de una vez; rol `Visualizador` (D53, R3 con 403), managed app router (D54), instancias `reporte-simple-*` (D55), `ESTADO.md` (D57). Build revisado: `cds.build.tasks` explícito no compila el TS (D60).
- 2026-11-11 — Primer despliegue en `<CF_ORG> / dev` (aprobado): cuota suficiente; 250,5 / 256 MB → redeploy a 512 MB (D61, 81,7 MB en uso); 401 de XSUAA en inglés → excepción de R10 (D62).
- 2026-11-11 — Pruebas del usuario en el despliegue con datos reales de `<S4_SISTEMA>`: 403 sin rol, R7 + R14 (`AA 0015`: 520 · 350), F4 `Frankfurt`, decimales, todo ✔. Llamadas al RAP confirmadas en los logs (D63). Work Zone postergado. **Etapa 5 cerrada** (pendiente de revisión y merge a `main` por el usuario). Etapa activa: 6.
- 2026-11-11 — Revisión del usuario: D58–D63 aprobadas; R7 ajustada a `/_Flight`, `$expand` fuera de alcance (D64, tests como regresión); URL exacta al S/4 pendiente una vez (D63, paso 7b). **Etapa 5 aprobada y mergeada a `main`** (`--no-ff`). Etapa 6 no iniciada.
- 2026-11-11 — Etapa 6 (plan aprobado de una vez): `npm audit` 37 → 0 (D66), marcadores + `LOCAL.md` (D67), `S4_BACKEND` + `.mtaext` (D65), README, CI con mocks (D68), MIT. `npm test` 186/186, mutaciones 2/2. Paso 7 (historial en un clon) bloqueado: `git filter-repo` no disponible.
- 2026-11-11 — Paso 7: el usuario instaló `git filter-repo`; clon `reporte-simple-publico` con historial reescrito y escaneo de todas las revisiones en 0. **Etapa 6 cerrada** (pendiente: push del usuario, capturas, revisión y merge a `main`, pasos de CF / Cloud Connector).
