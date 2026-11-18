# Pruebas manuales — reporte-simple

Reglas de `SPEC.md` marcadas `[manual]`. Se ejecutan en la app Fiori con datos mock (`test/data/`) y se registra el resultado al final de cada prueba.

> **Estado (cierre de la Etapa 2, 2026-11-09):** pasos definidos, **todavía no ejecutados**.
> - R8 se ejecutó al cerrar la **Etapa 3** (2026-11-10, ver registro). **Se repite en la Etapa 4** (value help de aeropuertos, D50: pasos 6–6d).
> - R9 y R14 se ejecutan al cerrar la **Etapa 4** (pasos actualizados el 2026-11-10). El drilldown a Vuelos ya funciona con el mock (R7, D25); desplegado se verifica en la Etapa 5.
> - **Cierre de la Etapa 4 (2026-11-10):** R8 (pasos 6, 6c, 6d), R9 (pasos 1, 3, 8, 10b) y R14 (pasos 1, 4, 5) ejecutados por el usuario, todos ✔; R13 paso 5 verificado por Claude en la configuración servida. Los pasos que el usuario no reportó quedan marcados como **no reportados** en cada registro.
> - **Cierre de la Etapa 5 (2026-11-11):** pruebas en el despliegue con datos reales de `<S4_SISTEMA>` (sección "Despliegue" al final), todas ✔; R8 6b y R14 repetidos contra el RAP real. Cloud Connector Monitor no revisado: las llamadas al RAP se confirmaron en los logs (D63). R13 en Work Zone, postergado por el usuario.
> - **MCP Nivel 5 (2026-11-18):** inspección manual del servidor MCP `/mcp/reporte-agent` con el MCP Inspector en modo CLI (sección "MCP — Inspector" al final, D73).
> - Si cambia la tabla de semántica en `SPEC.md`, actualizar aquí los resultados esperados.

## Preparación (común)

1. En BAS, terminal en `/home/user/projects/reporte-simple`.
2. Si el puerto 4004 está ocupado: `pkill -f "cds"`.
3. Arrancar con `npm run watch` (no `tsx`: ver D13).
4. Abrir `Ctrl+Shift+P` → *Ports: Preview* → 4004 → `/conexiones/webapp/index.html`.
5. Iniciar sesión con el usuario `alice`, sin contraseña.
5b. Usar una **ventana normal** del navegador y **recarga forzada** (`Ctrl+Shift+R`) para no ver una versión en caché ni una variante guardada. **No usar incógnito:** con BAS se pierde la sesión del Dev Space.
6. Datos mock esperados: **5 conexiones**, **5 vuelos** y **5 aeropuertos** (`test/data/ZMAKS_SB_CONEXIONES-*.csv`). La conexión `LH 0402` no tiene vuelos (D28).

---

## R8 — Filtro por aeropuerto de salida y de destino

**Regla:** la lista de conexiones permite filtrar por aeropuerto de salida (`AirportFromId`) y de destino (`AirportToId`).

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la app (Preparación) y pulsar **Ir** sin filtros. | La tabla muestra las 5 conexiones. |
| 2 | Revisar la barra de filtros. | Aparecen los campos **Aeropuerto salida** y **Aeropuerto destino** (de `@UI.SelectionFields`). |
| 3 | Escribir en **Aeropuerto salida** un código que exista en `test/data/ZMAKS_SB_CONEXIONES-Conexiones.csv` (p. ej. `FRA`) y pulsar **Ir**. | Solo aparecen las conexiones con ese aeropuerto de salida (para `FRA`: `LH 0400` y `LH 0402`). |
| 4 | Borrar el filtro anterior, escribir en **Aeropuerto destino** un código del CSV (p. ej. `JFK`) y pulsar **Ir**. | Solo aparecen las conexiones con ese destino (para `JFK`: `LH 0400` y `LH 0402`). |
| 5 | Combinar salida y destino con valores que **no** coincidan en ninguna fila (p. ej. salida `FRA`, destino `SFO`). | La tabla queda vacía, con el mensaje de "sin datos" de Fiori, **sin error**. |
| 6 | Pulsar el F4 (ayuda de valores) de **Aeropuerto salida**. | Se abre el diálogo **Aeropuertos** con las columnas Aeropuerto · Nombre · Ciudad · País/región, en español, y los **5 aeropuertos** de `test/data` (también `MIA`, que no tiene conexiones: el F4 lista todos los aeropuertos, D50, D51). |
| 6b | En el diálogo, escribir `Frankfurt` en el campo de búsqueda. | Queda solo `FRA` (búsqueda `$search`, D51). |
| 6c | Seleccionar `FRA`, pulsar **Aceptar** e **Ir**. | El filtro Aeropuerto salida queda en `FRA` y la tabla muestra `LH 0400` y `LH 0402` (como el paso 3). |
| 6d | Repetir 6 y 6c con **Aeropuerto destino** eligiendo `JFK`. | Mismo diálogo; la tabla muestra `LH 0400` y `LH 0402`. |

> El antiguo paso 7 (revisar en DevTools que la URL sea relativa y que el `$filter` use `AirportFromId` / `AirportToId`) se quitó (D37): lo cubren el test de la regla 17 (D19), la verificación del proxy con curl (D21) y los pasos 3–4.

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| 2026-11-10 | 3 | Usuario | ✔ pasos 1–5 · paso 6 según lo esperado | 5 conexiones; filtros visibles; `FRA` y `JFK` devuelven LH 0400 y LH 0402; FRA→SFO vacía sin error. Paso 6: al pulsar el F4 de Aeropuerto salida no pasa nada (esperado: value help de `/dmo/i_airport_stdvh` no importado, se resuelve en la Etapa 4). |
| 2026-11-10 | 4 | Usuario | ✔ pasos 1, 6, 6c, 6d | Lista con 5 conexiones. F4 de Aeropuerto salida abre la lista; elegir `FRA` da LH 0400 y LH 0402. F4 de Aeropuerto destino con `JFK` da LH 0400 y LH 0402. **No reportados:** el detalle del paso 6 (columnas del diálogo, 5 aeropuertos con `MIA`); 2–5 ya ✔ en la Etapa 3. |
| 2026-11-10 | 4 | Usuario | ✖ paso 6b | En el diálogo del F4, escribir `Frankfurt` o `FRA` no encuentra FRA: quedan todos los valores. Directo en el campo del filtro da error por tener 3 caracteres (esperado). Elegir a mano funciona. **Causa (Claude):** faltaba `SearchSupported: true` en el `@Common.ValueList` (el servicio sí resuelve `$search`) → **corregido (D52)**, R11 lo vigila. **Pendiente: repetir 6b** en el navegador; contra el RAP real, en la Etapa 5. |
| 2026-11-11 | 5 | Usuario | ✔ paso 6b (desplegado) | Contra el RAP real (`<S4_SISTEMA>`, despliegue de la Etapa 5): en el diálogo del F4, `Frankfurt` encuentra el aeropuerto. Cierra el ✖ de la Etapa 4 (D52). |

---

## R13 — La app siempre en español

**Regla:** la app se muestra siempre en español (textos de la app y de Fiori, formato de números y fechas), sin importar el idioma del navegador (D33, D34).

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Poner el navegador en **inglés** (idioma preferido `en`) y abrir la app (Preparación) en ventana normal con recarga forzada (`Ctrl+Shift+R`), no en incógnito. | Los textos de Fiori salen en español ("Ir", "Adaptar filtros", "Todavía no hay entradas", …), no en inglés. |
| 2 | Abrir `AA 0017` y revisar **Precio vuelo**. | **"422,94 USD"**: coma decimal (R12, R13). |
| 3 | Revisar **Fecha vuelo** en la tabla de vuelos. | Fecha en formato español (p. ej. "1 dic 2026"), no "Dec 1, 2026". |
| 4 | En la consola de `npm run watch`, buscar `do not contain default fallback locale 'en'`. | El aviso **no** aparece (D33). |
| 5 | DevTools → Red: revisar qué archivo i18n pide la app. | Solo `i18n/i18n.properties`, sin intentos de `i18n_en.properties` ni `i18n_es.properties` (D33). |

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| 2026-11-10 | 3 | Usuario | ✔ pasos 1–3 | Chrome en inglés, ventana normal con recarga forzada (incógnito pierde la sesión de BAS). Botones de Fiori en español; AA 0017: "Precio vuelo" 422,94 USD y fecha en español. Paso 4 (aviso en la consola): ✔ **verificado por Claude** (2026-11-10): `npm run watch` en otro puerto, manifiesto servido con `fallbackLocale: ""`, 0 apariciones de `do not contain default fallback locale 'en'` (con la configuración anterior salían 3, D33). Paso 5 (Red, petición i18n): **no verificado**, el usuario no lo revisó. |
| 2026-11-10 | 4 | Claude | ✔ paso 5 **por configuración** | A pedido del usuario. No se pudo capturar la pestaña Red: el Dev Space no tiene navegador y Chromium headless no arranca (faltan librerías del sistema, sin `sudo`). Verificado en el `manifest.json` **servido** por `npm run watch`: `sap.app.i18n`, `models.i18n` y `models.@i18n` con `supportedLocales: [""]` y `fallbackLocale: ""` (UI5 solo carga el archivo sin sufijo); `data-sap-ui-language="es"` en `index.html`; `i18n/i18n.properties` → 200, `i18n_en.properties` y `i18n_es.properties` → 404 (no existen). Para la captura de red, repetir en el navegador (Etapa 5, con R13 desplegado). |

---

## R9 — Columnas, orden y drilldown según "Semántica del reporte"

**Regla:** columnas, orden y drilldown del reporte según la tabla **Semántica del reporte** de `SPEC.md`.

### A. List Report de Conexiones

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la app y pulsar **Ir**. | La tabla muestra estas columnas **en este orden**: 1 Id aerolínea · 2 Número vuelo · 3 Aeropuerto salida · 4 Aeropuerto destino · 5 Hora salida · 6 Hora llegada · 7 Distancia. **Sin** columna "Medida" (D39). |
| 2 | Revisar la columna **Id aerolínea**. | Muestra el código con su texto (`CarrierId_Text`, p. ej. "American Airlines"), según `@Common.Text` / `@UI.TextArrangement`. |
| 3 | Revisar la columna **Distancia** y la sección "Detalles de conexión" del detalle. | La distancia muestra su unidad junto al número (p. ej. `2572 MI`, `6162 KM`); no hay campo "Medida" aparte, ni en la lista ni en el detalle (D39). |
| 4 | Comparar cada etiqueta de columna con la columna "Etiqueta" de la tabla de semántica. | Coinciden todas, en español. |
| 4b | Abrir **Ajustes de tabla** (selector de columnas) y pasar el ratón por algunos campos y filtros. | Los nombres (p. ej. "Aerolínea", "Moneda") y los tooltips (p. ej. "Cantidad de asientos ocupados") están en español; no aparece "Airline Name", "Currency Code" ni "Flight Reference Scenario: …" (D40). |

### B. Drilldown: Conexión → detalle → Vuelos

| # | Paso | Resultado esperado |
|---|---|---|
| 5 | Hacer clic en la conexión `AA 0017`. | Se abre el detalle (Object Page) de la conexión. El título usa **Nombre aerolínea** (`CarrierName`). |
| 6 | Revisar la sección de Vuelos del detalle. | Aparecen **solo** los vuelos de `AA 0017` (mismo `CarrierId` y `ConnectionId`): en el mock, 2 vuelos (2026-12-01 y 2026-12-15). En el mock lo resuelve `test/mock/rap.ts` (R7, D25). |
| 6b | Volver a la lista y abrir la conexión `LH 0402`. | La sección de Vuelos queda **vacía**, con el mensaje de "sin datos" de Fiori y **sin error** (conexión sin vuelos, D28). |
| 7 | Revisar las columnas de la tabla de Vuelos. | En este orden: 1 Id aerolínea · 2 Número vuelo · 3 Fecha vuelo · 4 Precio vuelo · 5 Tipo vuelo · 6 Capacidad máxima · 7 Ocupación asientos · 8 Nombre aerolínea. **Precio vuelo** muestra la moneda (`CurrencyCode`, p. ej. USD). |
| 7b | Revisar **Precio vuelo** de los vuelos de `AA 0017` (R12). | Se muestra como **"422,94 USD"**: decimales completos y coma decimal (D11). UI5 está fijado en español (R13, D34), así que se ve igual con el navegador en inglés. Si sale "423 USD", R12 falla. |
| 8 | Hacer clic en un vuelo. | Se abre el **detalle del vuelo** (drilldown al vuelo se mantiene, D41): título **Nombre aerolínea**, cabecera Número vuelo y Fecha vuelo, sección "Detalle vuelo" con Precio vuelo, Tipo vuelo, Capacidad máxima y Ocupación asientos. |
| 9 | Volver atrás con el botón del navegador o el de Fiori. | Se regresa al detalle de la conexión y luego a la lista, conservando los filtros. |
| 10 | Totales de la conexión. | Se prueban en **R14** (cabecera del detalle, D47). La tabla de vuelos es responsive y **no** tiene totales al pie. |
| 10b | En la lista de conexiones y en la tabla de vuelos del detalle, buscar el botón **Exportar a hoja de cálculo** y usarlo (D41). | Se descarga un `.xlsx` con las filas y columnas visibles, con las etiquetas en español. |

### C. Solo lectura en la interfaz (complemento visual de R2)

| # | Paso | Resultado esperado |
|---|---|---|
| 11 | En la lista y en los detalles, buscar botones **Crear**, **Editar** o **Eliminar**. | No aparecen (las entidades son `@readonly`). |

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| 2026-11-10 | 4 | Usuario | ✔ pasos 1, 3, 8, 10b | 5 conexiones, sin columna "Medida" (D39); drilldown al detalle del vuelo (D41); exportación a Excel con las columnas en español. Textos de encabezados y ayudas (D44) y de los totales (D47): "se ven bien en la app" (revisión del usuario). **No reportados:** 2, 4, 4b, 5, 6, 6b, 7, 7b, 9, 11 (7b ya ✔ en la Etapa 3: 422,94 USD; 6/6b cubiertos por R7 en el navegador en la Etapa 3); en 10b no se indicó si se exportaron las dos tablas o solo una. |

---

## R14 — Totales en la cabecera del detalle de una conexión

**Regla:** el detalle de una conexión muestra en la cabecera **Asientos ocupados** (suma de `SeatsOccupied` de sus vuelos) y **Capacidad** (suma de `SeatsMax`). Sin vuelos → 0 y 0. La tabla "Detalles de vuelos" es responsive, sin totales al pie (D47). Lo automático (valores, una petición al RAP, `$batch`) lo cubren `test/r14-totales*.test.ts`; aquí se verifica lo que se ve.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la app (Preparación), pulsar **Ir** y abrir `AA 0017`. | En la cabecera, junto a Aeropuerto salida y Aeropuerto destino: **Asientos ocupados 573** y **Capacidad 770** (372 + 201 y 385 + 385, `test/data`). |
| 2 | Comparar con la tabla "Detalles de vuelos" del mismo detalle. | 2 vuelos; la suma de **Ocupación asientos** (372 + 201) y de **Capacidad máxima** (385 + 385) coincide con la cabecera. |
| 3 | Revisar la tabla "Detalles de vuelos". | Tabla **responsive** (filas tipo lista, sin barra de desplazamiento horizontal tipo grilla), **sin** fila de totales al pie y sin aviso de error. |
| 4 | Volver y abrir `LH 0400`. | **Asientos ocupados 314**, **Capacidad 330** (un vuelo). |
| 5 | Volver y abrir `LH 0402` (sin vuelos). | **Asientos ocupados 0** y **Capacidad 0**, sin error; la tabla de vuelos vacía (R7). |
| 6 | Pasar el ratón por las etiquetas de los totales (o revisar el selector de campos). | Etiquetas en español "Asientos ocupados" y "Capacidad" (D40). |

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| 2026-11-10 | 4 | Usuario | ✔ pasos 1, 4, 5 | AA 0017 = 573 / 770, LH 0400 = 314 / 330, LH 0402 = 0 / 0. **No reportados:** 2, 3, 6 (textos de los totales revisados por el usuario: "se ven bien en la app"). |
| 2026-11-11 | 5 | Usuario | ✔ pasos 1–2 con datos reales (desplegado) | `AA 0015` en `<S4_SISTEMA>`: 2 vuelos (capacidad 260 c/u; ocupación 213 y 137) → cabecera **Capacidad 520 · Asientos ocupados 350**, igual a la suma de la tabla y a la prueba A de `GW_CLIENT` (520). **No reportados:** 3–6 (ya ✔ en la Etapa 4 con el mock). |

---

## Despliegue — Reporte desplegado en Cloud Foundry contra el RAP real (Etapa 5)

**Cubre:** R3 (403 sin el rol, D53), R5 (datos de la destination `S4_BACKEND`), R7 y R14 contra el RAP real, R8 (F4), R12 / R13 (importes). Lo que no necesita navegador (401 sin token, `/health`, logs) lo hace Claude con `curl` y `cf logs`. Repetir después de cada `cf deploy`.

**Preparación:** URL de la app (managed app router): `<URL_APP>`. El prefijo es el GUID de la instancia `reporte-simple-destination` (`cf service reporte-simple-destination --guid`) y el sufijo, `sap.cloud.service` + id + versión de la app (D59).

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la URL **antes** de tener la role collection `ReporteSimple_Visualizador`. | Login de BTP y después error en la lista, **sin datos** (403, R3 / D53). |
| 2 | BTP Cockpit → Security → Users: asignarse `ReporteSimple_Visualizador`; abrir la URL en incógnito (token nuevo). | La app abre. |
| 3 | Pulsar **Ir**. | Conexiones **reales** de `<S4_SISTEMA>` (no las 5 del mock), en español. |
| 4 | Abrir una conexión con vuelos (p. ej. `AA 0015`). | "Detalles de vuelos" con sus vuelos (R7); cabecera con **Capacidad** y **Asientos ocupados** = suma de la tabla y de `GW_CLIENT` `…/_Flight?$apply=aggregate(SeatsOccupied,SeatsMax)` (R14). |
| 5 | Filtro Aeropuerto salida → F4 → buscar `Frankfurt`. | El diálogo encuentra el aeropuerto (R8 6b, D52). |
| 6 | Ver un precio en "Detalles de vuelos". | Decimales completos y formato en español (p. ej. `422,94 USD`, R12 / R13). |
| 7 | Cloud Connector → Monitor (opcional en cada deploy, D63). | Llegan peticiones a `/sap/opu/odata4/...`. Si no se revisa, Claude confirma las llamadas en `cf logs reporte-simple-srv --recent`. |
| 7b | **Pendiente, una sola vez (D63):** confirmar la **URL exacta** que llega al S/4, con el Cloud Connector → Monitor o con `DEBUG=remote` en la app (`cf set-env reporte-simple-srv DEBUG remote` + `cf restage`; quitarlo al terminar). | `/sap/opu/odata4/sap/zmaks_sb_conexiones/srvd/sap/zmaks_sd_conexiones/0001/Conexiones…` (con `/_Flight` y, para R14, `Vuelos?$apply=filter(...)/groupby(...)`), y la del F4 con `;ps=…;va=…`. Los logs normales de la app no la muestran. |

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| 2026-11-11 | 5 | Usuario | ✔ pasos 1–6 | 403 sin rol; datos reales de `<S4_SISTEMA>`; `AA 0015` con 2 vuelos (260 / 260; 213 / 137) y cabecera 520 · 350; F4 `Frankfurt` encuentra; precio con decimales. Paso 7 no revisado por el usuario. **7b pendiente** (URL exacta al S/4, una vez). |
| 2026-11-11 | 5 | Claude | ✔ 401 / `/health` · paso 7 por logs | `/health` UP; sin token 401 `Unauthorized` (excepción de R10, D62). Logs 15:05–15:09: 8 `$batch` de Fiori → 200; 4 lecturas de cabecera (`AA 15` ×3, `AA 17`) y 4 de `_Flight`, y **12** resoluciones de la destination OnPremise del Cloud SDK = 4 × (conexión + totales de R14) + 4 `_Flight`: una por llamada al RAP. Sin errores; único aviso, "basic authentication… Principal propagation is recommended" (pendiente para la Etapa 6). |

---

## MCP — Inspector: las tools de `ReporteAgentService` a mano (Nivel 5, D73)

**Cubre:** R15 (servicio para agentes, solo lectura, rol `Visualizador`: 401/403) y R16 (`ocupacionPorConexion`, validación de `aerolinea`), vistos con el JSON que recibe y devuelve cada tool. Lo automático ya lo cubren `test/r15-agente*.test.ts` y `test/r16-ocupacion*.test.ts`; aquí se aprende el formato y se deja la evidencia.

**Preparación:** terminal 1 con `npm run watch` (el log muestra `/mcp/reporte-agent`). Terminal 2:

```bash
URL=http://localhost:4004/mcp/reporte-agent
I="npx -y @modelcontextprotocol/inspector --cli $URL --transport http"
ALICE='Authorization: Basic YWxpY2U6'      # alice: (contraseña vacía), rol Visualizador
SINROL='Authorization: Basic c2lucm9sOg==' # sinrol: (sin roles)
```

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | `$I --header "$ALICE" --method tools/list` | 3 tools: `describe`, `ocupacionPorConexion`, `query`, todas con `readOnlyHint: true`; sin `call` (D72 punto 5). Cada una con su `inputSchema`. |
| 2 | `describe` (`tools/call --tool-name describe`) | Entidades `Conexiones`, `Vuelos`, `Aeropuertos` y la función, con las descripciones de negocio (`/** */`). |
| 3 | `query` sobre `Conexiones` (argumentos según el `inputSchema` del paso 1) | Filas del mock (`test/data`), solo los campos de la proyección (D70). |
| 4 | `ocupacionPorConexion` con `aerolinea=LH` | 2 filas: `LH 0400` (314 / 330, **95,2 %**) y `LH 0402` (0 vuelos, 0 / 0, % `null`). |
| 5 | `ocupacionPorConexion` con `aerolinea=LH' or 1 eq 1` | Error con el mensaje en español de D72 punto 7 ("El código de aerolínea … no es válido…"), sin datos. |
| 6 | `tools/list` con `$SINROL`, y sin cabecera; `curl -i` equivalente | Inspector: no conecta. `curl`: **403** con `sinrol`, **401** sin credenciales. |

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|

**Evidencia (salidas del Inspector)**

_Se completa con las salidas que pega el usuario._
