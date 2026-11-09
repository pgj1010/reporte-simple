# PLAN.md — reporte-simple

Objetivo: reporte de **Conexiones y Vuelos** en CAP (TypeScript) + Fiori Elements, leyendo el servicio RAP `ZMAKS_SB_CONEXIONES`, desplegado en Cloud Foundry, y dejarlo como **plantilla para futuros reportes**.

Reglas del plan (ver `CLAUDE.md`):
- Una etapa a la vez, en su propia rama `etapa-N-<nombre>`. Merge a `main` solo tras revisión del usuario.
- Proponer plan y esperar aprobación antes de tocar archivos.
- Al terminar cada paso: `npm test`, mostrar resultado, actualizar este archivo.
- Cada decisión propia se anota en **"Decisiones de la etapa"** en el momento de tomarla (y en `SPEC.md`).
- Al cerrar la etapa: marcar `[x]`, listar decisiones (regla afectada + qué pasaría si fueran al revés), actualizar "Etapa activa" y la Bitácora.

**Etapa activa:** 2

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

## Etapa 2 — Alineación con reglas del equipo
Rama: `etapa-2-alineacion`
- [x] Inicializar Git, primer commit en `main` con lo actual (incluye `app/conexiones` ya generada); crear rama de la etapa
- [x] Configurar `npm test` (`cds.test` + `node:test` + `tsx`, D6) — adelantado (D9). Requiere `@cap-js/cds-test`; arranque con `--with-mocks --in-memory`; plugin UI5 desactivado en tests (D12)
- [x] Migrar a TypeScript: `cds add typescript`, `service.js` → `service.ts`, tipos con cds-typer (`pretest` los genera). TypeScript nativo de Node 24, sin `tsx` (D13)
- [x] Mover CSV de `srv/external/data/` a `test/data/` y verificar que `cds watch` y los tests los cargan (4 conexiones, 5 vuelos: `init from test/data/...`)
- [x] Verificar que `cds build --production` **no** incluye `test/data` (sin CSV ni carpetas `test/`/`data/`; perfil `production` → destination `S4_BACKEND`, desarrollo → mock)
- [x] Agregar `@requires: 'authenticated-user'` a `ReporteService` (R3) — sin usuario 401, con `alice` 200 (test + `npm run watch`)
- [ ] Mensajes en español por defecto (R10, D11)
- [ ] Tests para R1, R2, R3, R4, R5, R6, R10 — hecho: R5 (`test/r5-datos.test.ts`, D14), R3 (`test/r3-autenticacion.test.ts`: `Conexiones`, `Vuelos` y `$metadata`)
- [ ] Pruebas de mutación de R2 y R3 (quitar `@readonly` / `@requires` → el test debe fallar) con `npm run test:mutacion` (D10)
- [ ] Crear `test/PRUEBAS_MANUALES.md` (R8, R9)

Salida: `npm test` en verde; mutaciones detectadas; `cds watch` sigue mostrando los datos mock.

### Decisiones de la etapa
- D7 — Cada reporte es un proyecto CAP independiente (decisión del usuario).
- D1 — Clean core flexible (aprobado por el usuario).
- D2 — Migrar a TypeScript ahora (aprobado por el usuario).
- D3 — Mutación solo para R2 y R3 (aprobado por el usuario).
- D6 — ~~`node:test` + `tsx` para los tests.~~ **Reemplazada por D13.**
- D9 — `npm test` se configura en el paso 2 (antes de la migración a TS) para cumplir la regla 4 desde el inicio. Aprobado por el usuario.
- D10 — Mutación en script aparte (`npm run test:mutacion`) sobre una copia temporal del proyecto; nunca modifica los archivos reales. Aprobado por el usuario.
- D12 — `npm test` corre con `CDS_PLUGIN_UI5_ACTIVE=false`: con el plugin UI5 el proceso de test no termina (y con `tsx` se caía por memoria); los tests cubren el servicio OData, no la app.
- D13 — TypeScript nativo de Node 24, sin `tsx` (reemplaza a D6). `tsx` + `cds-plugin-ui5` agota la memoria en `cds watch` y en tests. `npm run watch` = `CDS_TYPESCRIPT=false cds watch` (no se puede fijar por `.env` ni `package.json`). `tsconfig`: `erasableSyntaxOnly`, `verbatimModuleSyntax`, `rewriteRelativeImportExtensions`. Aprobado por el usuario, con esos ajustes.
- D14 — El test de R5 corre `cds build --production` **dentro de `npm test`** (~2 s), sin script aparte. Si llegara a pasar de ~15 s, se separaría en `npm run test:build`.
- D11 — R10: idioma por defecto **español**; los mensajes salen en español aunque el navegador pida otro idioma. Decisión del usuario.

## Etapa 3 — App Fiori Elements (List Report + Object Page)
Rama: `etapa-3-fiori`
- [ ] Generar app con *Fiori: Open Application Generator* → List Report, CAP local, entidad `Conexiones` → `app/conexiones`
- [ ] Corregir rutas del `manifest.json` a **relativas** (`odata/v4/reporte/`)
- [ ] Verificar tabla, filtros (R8) y textos heredados del RAP
- [ ] Resolver la asociación `_Flight` (condición `CarrierId` + `ConnectionId`) para que el detalle muestre vuelos (R7)
- [ ] Probar drilldown a la página de detalle
- [ ] **Pendiente (de Etapa 2):** `cds add typescript` instaló TypeScript 7 y `@sap-ux/eslint-plugin-fiori-tools` (vía `typescript-eslint`) pide `typescript <6.1`. Afecta solo al lint de la app; decidir cómo resolverlo

Salida: la app abre, lista las conexiones mock y navega al detalle con sus vuelos; `npm test` en verde.

### Decisiones de la etapa
- _(anotar aquí al tomarlas)_

## Etapa 4 — Presentación del reporte
Rama: `etapa-4-presentacion`
- [ ] Revisar con el usuario la tabla **Semántica del reporte** de `SPEC.md` y cerrar los "por definir" (medidas / totales, orden de columnas)
- [ ] Generar o ajustar `app/conexiones/annotations.cds` a partir de la tabla (D8)
- [ ] Si hay totales: confirmar `$apply` en mock y probar la tabla con sumatorias
- [ ] Resolver el value help de aeropuertos (importar el servicio `/dmo/i_airport_stdvh` o `@Common.ValueList` propio)
- [ ] Test R11: anotaciones efectivas = tabla de semántica
- [ ] Decidir drilldown (sí/no, hasta qué nivel) en `manifest.json`
- [ ] Opcional: exportar a Excel, variantes, tabla responsive vs grid
- [ ] Actualizar `test/PRUEBAS_MANUALES.md` (R8, R9)

Salida: el reporte se ve y navega como dice la tabla de semántica, con datos mock; R11 en verde.

### Decisiones de la etapa
- D8 — Tabla "Semántica del reporte" como fuente de verdad de las anotaciones (decisión del usuario, tomada antes de iniciar la etapa).

## Etapa 5 — Despliegue a Cloud Foundry
Rama: `etapa-5-despliegue`
- [ ] `cds add mta` (+ `xsuaa`, `destination`, `connectivity`, app router o managed app router según `etiquetas`)
- [ ] Roles en `xs-security.json` coherentes con `@requires` / `@restrict`
- [ ] Reutilizar o crear instancias `destination` / `connectivity` (lite)
- [ ] Configuración de despliegue de la app Fiori (HTML5 repo)
- [ ] Verificar que `cds build --production` compila el TypeScript correctamente sin `tsx` (`gen/srv` con `service.js`, imports `#cds-models` resueltos, sin `.ts` en el runtime) — D13. **Hallazgo 2026-11-09 (Etapa 2, paso 4):** hoy el build copia `srv/service.ts` sin compilar y no incluye `@cds-models` → el despliegue fallaría al arrancar. También genera artefactos HANA (`src/gen`, `cds.outbox.Messages`) aunque el reporte no tiene base de datos propia: revisar si hacen falta
- [ ] `mbt build` y **pedir aprobación** antes de `cf deploy`
- [ ] Probar `/odata/v4/reporte/Conexiones` desplegado → datos **reales** del RAP
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
- 2026-11-09 — D8: tabla "Semántica del reporte" como fuente de verdad de anotaciones (filtros, obligatorios, columnas, medidas, textos, value helps), para servicios que no vienen enriquecidos. Nueva regla R11 y sección "Análisis del servicio origen". Se detecta que el value help de aeropuertos no funciona en CAP (apunta a otro servicio). Etapa 7 se amplía a "generalización" por pedido del usuario.
