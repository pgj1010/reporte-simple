# Pruebas manuales — reporte-simple

Reglas de `SPEC.md` marcadas `[manual]`. Se ejecutan en la app Fiori con datos mock (`test/data/`) y se registra el resultado al final de cada prueba.

> **Estado (cierre de la Etapa 2, 2026-11-09):** pasos definidos, **todavía no ejecutados**.
> - R8 se ejecutó al cerrar la **Etapa 3** (2026-11-10, ver registro). Se repite en la **Etapa 4** si cambian los filtros o el value help de aeropuertos.
> - R9 se ejecuta al cerrar la **Etapa 4**, cuando la tabla **Semántica del reporte** esté cerrada. El drilldown a Vuelos ya funciona con el mock (R7, D25); desplegado se verifica en la Etapa 5.
> - Si cambia la tabla de semántica en `SPEC.md`, actualizar aquí los resultados esperados.

## Preparación (común)

1. En BAS, terminal en `/home/user/projects/reporte-simple`.
2. Si el puerto 4004 está ocupado: `pkill -f "cds"`.
3. Arrancar con `npm run watch` (no `tsx`: ver D13).
4. Abrir `Ctrl+Shift+P` → *Ports: Preview* → 4004 → `/conexiones/webapp/index.html`.
5. Iniciar sesión con el usuario `alice`, sin contraseña.
5b. Usar una **ventana normal** del navegador y **recarga forzada** (`Ctrl+Shift+R`) para no ver una versión en caché ni una variante guardada. **No usar incógnito:** con BAS se pierde la sesión del Dev Space.
6. Datos mock esperados: **5 conexiones** y **5 vuelos** (`test/data/ZMAKS_SB_CONEXIONES-*.csv`). La conexión `LH 0402` no tiene vuelos (D28).

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
| 6 | Pulsar el F4 (ayuda de valores) de **Aeropuerto salida**. | Hoy se espera que **no funcione**: el value help del RAP apunta a `/dmo/i_airport_stdvh`, que no se importó (ver SPEC, "Análisis del servicio origen"). Anotar el comportamiento observado. Se resuelve en la Etapa 4. |

> El antiguo paso 7 (revisar en DevTools que la URL sea relativa y que el `$filter` use `AirportFromId` / `AirportToId`) se quitó (D37): lo cubren el test de la regla 17 (D19), la verificación del proxy con curl (D21) y los pasos 3–4.

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| 2026-11-10 | 3 | Usuario | ✔ pasos 1–5 · paso 6 según lo esperado | 5 conexiones; filtros visibles; `FRA` y `JFK` devuelven LH 0400 y LH 0402; FRA→SFO vacía sin error. Paso 6: al pulsar el F4 de Aeropuerto salida no pasa nada (esperado: value help de `/dmo/i_airport_stdvh` no importado, se resuelve en la Etapa 4). |

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
| 2026-11-10 | 3 | Usuario | ✔ pasos 1–3 | Chrome en inglés, ventana normal con recarga forzada (incógnito pierde la sesión de BAS). Botones de Fiori en español; AA 0017: "Precio vuelo" 422,94 USD y fecha en español. Paso 4 (aviso en la consola): **resultado no informado** por el usuario; el aviso ya no aparece al servir el manifiesto (comprobado por Claude, D33). Paso 5 (Red, petición i18n): **no verificado**, el usuario no lo revisó. |

---

## R9 — Columnas, orden y drilldown según "Semántica del reporte"

**Regla:** columnas, orden y drilldown del reporte según la tabla **Semántica del reporte** de `SPEC.md`.

### A. List Report de Conexiones

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir la app y pulsar **Ir**. | La tabla muestra estas columnas **en este orden**: 1 Id aerolínea · 2 Número vuelo · 3 Aeropuerto salida · 4 Aeropuerto destino · 5 Hora salida · 6 Hora llegada · 7 Distancia · 8 Medida. |
| 2 | Revisar la columna **Id aerolínea**. | Muestra el código con su texto (`CarrierId_Text`, p. ej. "American Airlines"), según `@Common.Text` / `@UI.TextArrangement`. |
| 3 | Revisar la columna **Distancia**. | Muestra la unidad de `DistanceUnit` (p. ej. `MI`, `KM`). |
| 4 | Comparar cada etiqueta de columna con la columna "Etiqueta" de la tabla de semántica. | Coinciden todas, en español. |

### B. Drilldown: Conexión → detalle → Vuelos

| # | Paso | Resultado esperado |
|---|---|---|
| 5 | Hacer clic en la conexión `AA 0017`. | Se abre el detalle (Object Page) de la conexión. El título usa **Nombre aerolínea** (`CarrierName`). |
| 6 | Revisar la sección de Vuelos del detalle. | Aparecen **solo** los vuelos de `AA 0017` (mismo `CarrierId` y `ConnectionId`): en el mock, 2 vuelos (2026-12-01 y 2026-12-15). En el mock lo resuelve `test/mock/rap.ts` (R7, D25). |
| 6b | Volver a la lista y abrir la conexión `LH 0402`. | La sección de Vuelos queda **vacía**, con el mensaje de "sin datos" de Fiori y **sin error** (conexión sin vuelos, D28). |
| 7 | Revisar las columnas de la tabla de Vuelos. | En este orden: 1 Id aerolínea · 2 Número vuelo · 3 Fecha vuelo · 4 Precio vuelo · 5 Tipo vuelo · 6 Capacidad máxima · 7 Ocupación asientos · 8 Nombre aerolínea. **Precio vuelo** muestra la moneda (`CurrencyCode`, p. ej. USD). |
| 7b | Revisar **Precio vuelo** de los vuelos de `AA 0017` (R12). | Se muestra como **"422,94 USD"**: decimales completos y coma decimal (D11). UI5 está fijado en español (R13, D34), así que se ve igual con el navegador en inglés. Si sale "423 USD", R12 falla. |
| 8 | Hacer clic en un vuelo. | Según la decisión de drilldown de la Etapa 4: se abre el detalle del vuelo, o no hay navegación. Anotar cuál se acordó. |
| 9 | Volver atrás con el botón del navegador o el de Fiori. | Se regresa al detalle de la conexión y luego a la lista, conservando los filtros. |
| 10 | Si en la Etapa 4 se definen medidas o totales (hoy "_por definir_"): revisar la tabla. | Los totales coinciden con la suma de las filas mostradas. Agregar aquí los pasos concretos. |

### C. Solo lectura en la interfaz (complemento visual de R2)

| # | Paso | Resultado esperado |
|---|---|---|
| 11 | En la lista y en los detalles, buscar botones **Crear**, **Editar** o **Eliminar**. | No aparecen (las entidades son `@readonly`). |

**Registro de ejecución**

| Fecha | Etapa | Ejecutó | Resultado (✔ / ✖ + paso) | Observaciones |
|---|---|---|---|---|
| | | | | |
