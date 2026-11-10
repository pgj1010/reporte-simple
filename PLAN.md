# PLAN.md — reporte-simple

Objetivo: reporte de **Conexiones y Vuelos** en CAP (TypeScript) + Fiori Elements, leyendo el servicio RAP `ZMAKS_SB_CONEXIONES`, desplegado en Cloud Foundry, y dejarlo como **plantilla para futuros reportes**.

Reglas del plan (ver `CLAUDE.md`):
- Una etapa a la vez, en su propia rama `etapa-N-<nombre>`. Merge a `main` solo tras revisión del usuario.
- Proponer plan y esperar aprobación antes de tocar archivos.
- Al terminar cada paso: `npm test`, mostrar resultado, actualizar este archivo.
- Cada decisión propia se anota en **"Decisiones de la etapa"** en el momento de tomarla (y en `SPEC.md`).
- Al cerrar la etapa: marcar `[x]`, listar decisiones (regla afectada + qué pasaría si fueran al revés), actualizar "Etapa activa" y la Bitácora.

**Etapa activa:** 3

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

## Etapa 3 — App Fiori Elements (List Report + Object Page)
Rama: `etapa-3-fiori`
- [x] ~~Generar app~~ La app `app/conexiones` ya fue generada (2026-11-09, antes de la Etapa 2; List Report V4, `Conexiones` + `_Flight`): **revisarla** en lugar de regenerarla. Revisada el 2026-11-10; hallazgos en los pendientes de abajo
- [x] Corregir rutas del `manifest.json` a **relativas** (`odata/v4/reporte/`). Test automático de la regla 17 (D19, mutación manual detectada con `/` y `http://`); los tests OPA quedan fuera (D20); proxy local en `ui5.yaml` (D21). Verificado con curl (4 conexiones con `alice`, 401 sin usuario, sin bucle de proxy) y en el navegador por el usuario: los datos llegan por `/conexiones/odata/v4/reporte/` y aparecen los filtros de aeropuerto de salida y de destino
- [ ] Verificar tabla, filtros (R8) y textos heredados del RAP
- [x] **Adelantado de la Etapa 4 (bloquea R7):** la tabla sale **sin columnas** por defecto (el usuario tuvo que agregarlas a mano; la variante queda "Estándar*"): el `@UI.LineItem` del RAP no se aplica. Investigar la causa (¿avisos `SAP__UI.* is not a known vocabulary type`?) y resolverlo sin editar `srv/external`, con la tabla **Semántica del reporte** como fuente (D8). Revisar también la página de detalle (`Facets`, `HeaderInfo`)
  - [x] `SPEC.md`: causa en "Análisis del servicio origen", Origen `CAP` en la semántica, sección "Página de detalle", D22 · `CLAUDE.md`: lección aprendida · `annotations.cds` desde la tabla · test R11 adelantado · verificación del usuario en el navegador (8 columnas sin personalizar, en incógnito o sin la variante armada a mano). **Hecho (2026-11-10):** `annotations.cds` con tipos `UI.*` (D22), unidad de `Distance` (D23), etiquetas de `Vuelos` en español (D24); R11 lee la tabla de `SPEC.md` (mutación rápida detectada); avisos de `cds compile` 34 → 0; `npm test` 64/64. Confirmado por el usuario en incógnito: 8 columnas sin personalizar, variante "Estándar" sin asterisco, cabecera y "Detalles de conexión" correctos. "Detalles de vuelos" sigue pendiente de R7
- [x] Resolver la asociación `_Flight` (condición `CarrierId` + `ConnectionId`) para que el detalle muestre vuelos (R7). **Hecho (2026-11-10):** mock en `test/mock/rap.ts`, cargado por `test/mocked.js` (D25, D29), con la condición confirmada en ADT; `srv/` sin cambios. Tests `r7-navegacion` (mock, incluye conexión sin vuelos `LH 0402`, D28) y `r7-produccion` (proceso aparte con `NODE_ENV=production`: `_Flight` llega al RAP tal cual y el mock no se activa, D26). R10 cubre los 500 (D27). Mutaciones manuales detectadas: mock desactivado (7/8 fallan), condición sin `ConnectionId` (4/8), `_FlightCAP as _Flight` en `srv/` (3/3 de delegación). El build de producción incluía `test/` compilado (también el mock): `include` en `tsconfig.json` + `tsconfig.test.json` (D30, adelantado de la Etapa 5); `npm test` 82/82. Verificado por el usuario en el navegador (2026-11-10): AA 0017 muestra exactamente sus 2 vuelos (1 y 15 dic 2026), todo en español. LH 0402: "Detalles de vuelos" vacía con "Todavía no hay entradas", sin error (confirmado por el usuario). Hallazgo: "Precio vuelo" muestra 423 USD en vez de 422.94 → R12
- [x] R12 — importes con decimales completos (hallazgo del usuario: 423 USD en vez de 422.94). Anotación `@odata.Type`/`Precision`/`Scale: 'variable'` de `Price` en `srv/service.cds` (D31, D32); test `r12-importes` (todos los `Edm.Decimal` del RAP; mutación sin la anotación detectada, 2/4 fallan); paso 7b de R9 en `PRUEBAS_MANUALES.md` ("422,94 USD"). Verificado por el usuario en el navegador (2026-11-10): AA 0017 muestra los decimales correctos (ya no 423)
- [ ] Probar drilldown a la página de detalle
- [ ] Ejecutar R8 de `test/PRUEBAS_MANUALES.md` y registrar el resultado
- [ ] Arrancar siempre con `npm run watch` (D13); no instalar `tsx`
- [ ] **Pendiente (revisión de la app):** `webapp/index.html` tiene `lang="en"` → `lang="es"` (D11). Relacionado: el UI5 tooling avisa `Generated supported locales ('') for bundle 'i18n/i18n.properties' do not contain default fallback locale 'en'` (falta `supportedLocales` / `fallbackLocale` en `manifest.json`, o `i18n_es.properties`)
- [ ] **Pendiente (revisión de la app):** `annotations.cds` vacío (solo `using`) · UI5 1.154.0 cargado desde el CDN en `index.html` · `sap.fiori.archeType: transactional` en una app de solo lectura · `.appGenInfo.json` conserva `http://localhost:4004/...` (registro del generador, no se toca, D20)
- [ ] **Pendiente (de Etapa 2):** `cds add typescript` instaló TypeScript 7 y `@sap-ux/eslint-plugin-fiori-tools` (vía `typescript-eslint`) pide `typescript <6.1`. Afecta solo al lint de la app; decidir cómo resolverlo

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

## Etapa 4 — Presentación del reporte
Rama: `etapa-4-presentacion`
- [ ] Revisar con el usuario la tabla **Semántica del reporte** de `SPEC.md` y cerrar los "por definir" (medidas / totales, orden de columnas)
- [ ] Generar o ajustar `app/conexiones/annotations.cds` a partir de la tabla (D8)
- [ ] Si hay totales: confirmar `$apply` en mock y probar la tabla con sumatorias
- [ ] Resolver el value help de aeropuertos (importar el servicio `/dmo/i_airport_stdvh` o `@Common.ValueList` propio)
- [ ] Test R11: anotaciones efectivas = tabla de semántica
- [ ] Decidir drilldown (sí/no, hasta qué nivel) en `manifest.json`
- [ ] Opcional: exportar a Excel, variantes, tabla responsive vs grid
- [ ] Actualizar y ejecutar `test/PRUEBAS_MANUALES.md` (R8, R9), registrando el resultado
- [ ] **Pendiente (de Etapa 3, D23):** decidir si se quita la columna 8 "Medida" (`DistanceUnit`), ya que la unidad se ve junto a la distancia
- [ ] **Pendiente (de Etapa 3, D24):** campos fuera de la tabla de semántica con etiqueta en inglés desde el RAP (`CarrierId_Text` "Airline Name", `CurrencyCode` "Currency Code", …): decidir si se agregan a la tabla para traducirlos (D11)
- [ ] **Pendiente (de Etapa 2):** avisos del build `SAP__UI.* is not a known vocabulary type` (vienen de `srv/external`, generado — no editar): evaluar si afectan las anotaciones efectivas

Salida: el reporte se ve y navega como dice la tabla de semántica, con datos mock; R11 en verde.

### Decisiones de la etapa
- D8 — Tabla "Semántica del reporte" como fuente de verdad de las anotaciones (decisión del usuario, tomada antes de iniciar la etapa).

## Etapa 5 — Despliegue a Cloud Foundry
Rama: `etapa-5-despliegue`
- [ ] `cds add mta` (+ `xsuaa`, `destination`, `connectivity`, app router o managed app router según `etiquetas`)
- [ ] Roles en `xs-security.json` coherentes con `@requires` / `@restrict`
- [ ] Reutilizar o crear instancias `destination` / `connectivity` (lite)
- [ ] Configuración de despliegue de la app Fiori (HTML5 repo)
- [ ] Verificar que `cds build --production` compila el TypeScript correctamente sin `tsx` (`gen/srv` con `service.js`, imports `#cds-models` resueltos, sin `.ts` en el runtime) — D13. **Hallazgo 2026-11-09 (Etapa 2):** con `cds build -o <dir>` el build copia `srv/service.ts` sin compilar y no incluye `@cds-models`. Con el destino normal (`gen/`, o `CDS_BUILD_TARGET` **relativo**) sí compila el TS, pero como `tsconfig.json` no tiene `include`, compila **todo** el proyecto: los tests (`test/*.test.js`) terminan en `gen/srv/test/` y viajarían a producción. Con un `CDS_BUILD_TARGET` absoluto, `tsc` escribe dentro del proyecto (`./tmp/...`). ~~Revisar `include` / un `tsconfig` de build.~~ Resuelto en la Etapa 3 (D30). También genera artefactos HANA (`src/gen`, `cds.outbox.Messages`) aunque el reporte no tiene base de datos propia: revisar si hacen falta
- [ ] Verificar con XSUAA que el 401 sale por la clave i18n traducida ("No autenticado")
- [ ] Si se agrega CI: los tests de R4/R5 necesitan el `cds` de cds-dk global
- [ ] `mbt build` y **pedir aprobación** antes de `cf deploy`
- [ ] Probar `/odata/v4/reporte/Conexiones` desplegado → datos **reales** del RAP
- [ ] R7 desplegado: `Conexiones(...)/_Flight`, `$expand=_Flight` y la sección "Detalles de vuelos" contra el RAP real (la condición ya está confirmada en ADT; aquí se verifica que el RAP la aplique). D26 no cubre el join del RAP
- [ ] Confirmar en Cloud Connector → Monitor que llegan las peticiones

Salida: la app desplegada muestra datos reales de `<S4_SISTEMA>`, cliente <S4_CLIENTE>.

### Decisiones de la etapa
- _(anotar aquí al tomarlas)_

## Etapa 6 — Seguridad y limpieza
Rama: `etapa-6-limpieza`
- [ ] Regenerar service key de connectivity (`cf delete-service-key ...` + `cds bind`)
- [ ] Deshabilitar SSH en `etiquetas-srv` si no se usa (`cf disable-ssh etiquetas-srv`)
- [ ] Eliminar recurso redundante `/sap/opu/odata4/` del Cloud Connector (opcional)
- [ ] Revisar `.gitignore`

Salida: sin secretos expuestos; repo limpio.

### Decisiones de la etapa
- _(anotar aquí al tomarlas)_

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
