# SPEC.md — reporte-simple

Reporte de solo lectura de **Conexiones** y sus **Vuelos**, tomado del servicio RAP `ZMAKS_SB_CONEXIONES` en S/4HANA on‑premise (cliente <S4_CLIENTE>).

Cada regla tiene un test automático en `test/`, salvo las marcadas `[manual]`, cuyos pasos están en `test/PRUEBAS_MANUALES.md`.

---

## Reglas

| ID | Regla | Prueba |
|---|---|---|
| R1 | `ReporteService` expone exactamente dos entidades: `Conexiones` y `Vuelos`. | auto |
| R2 | Ambas entidades son de **solo lectura**: `POST`, `PATCH` y `DELETE` se rechazan. | auto + **mutación** |
| R3 | Todo acceso a `ReporteService` requiere **usuario autenticado** (`@requires: 'authenticated-user'`). Sin usuario → 401. | auto + **mutación** |
| R4 | Las lecturas se **delegan** al servicio remoto `ZMAKS_SB_CONEXIONES`; CAP no guarda copia de los datos. | auto |
| R5 | En desarrollo y test los datos vienen de `test/data/`; en producción, de la destination `S4_BACKEND`. Los CSV no se incluyen en el build. | auto (build) |
| R6 | `Conexiones` se identifica por `CarrierId` + `ConnectionId`; `Vuelos` por `CarrierId` + `ConnectionId` + `FlightDate`. | auto |
| R7 | Desde una conexión se puede navegar a sus vuelos (mismo `CarrierId` y `ConnectionId`). | auto (`$expand`) |
| R8 | La lista de conexiones permite filtrar por aeropuerto de salida y de destino. | [manual] |
| R9 | Columnas, orden y drilldown del reporte según la tabla **Semántica del reporte**. | [manual] |
| R10 | Los mensajes de error visibles al usuario están en español. | auto |
| R11 | Las anotaciones efectivas del servicio (filtros, obligatorios, columnas y orden, medidas, textos) coinciden con la tabla **Semántica del reporte**. | auto (modelo) |

---

## Análisis del servicio origen

Se completa al inicio de cada reporte, revisando el `$metadata` / el `.cds` importado.

| Pregunta | Resultado para `ZMAKS_SB_CONEXIONES` |
|---|---|
| ¿Trae anotaciones `@UI` (LineItem, SelectionFields, Facets, HeaderInfo)? | ✅ Sí, completas, heredadas del RAP |
| ¿Trae etiquetas (`@Common.Label`) y textos (`@Common.Text`)? | ✅ Sí (`CarrierId` → `CarrierId_Text`) |
| ¿Soporta agregación (`$apply`)? | ✅ Sí: `aggregate`, `groupby`, `filter` |
| ¿Tiene parámetros CDS (vistas con `parameters`)? | ❌ No |
| ¿Tiene campos de importe / unidad (`ISOCurrency`, `IsUnit`)? | ✅ `Price` → `CurrencyCode`; `DistanceUnit` es unidad |
| ¿Los value helps (`ValueListReferences`) apuntan a servicios disponibles en CAP? | ⚠️ No: apuntan a `/dmo/i_airport_stdvh` en otro servicio, que **no** se importó. El F4 de aeropuertos no funciona en CAP hasta resolverlo (Etapa 4). |
| ¿Hay restricciones de filtro? | `Vuelos.Price`: solo `MultiValue` |

---

## Semántica del reporte

Fuente de verdad para las anotaciones del reporte. Columna **Origen**: `RAP` = viene del servicio; `CAP` = se define o sobrescribe en `app/conexiones/annotations.cds`. Cambiar esta tabla primero; luego las anotaciones; luego el test R11.

### Conexiones (List Report)

| Campo | Etiqueta | Filtro | Obligatorio | Columna (orden) | Medida | Texto de / Unidad | Value help | Origen |
|---|---|---|---|---|---|---|---|---|
| CarrierId | Id aerolínea | — | — | 1 | — | texto: `CarrierId_Text` | — | RAP |
| ConnectionId | Número vuelo | — | — | 2 | — | — | — | RAP |
| AirportFromId | Aeropuerto salida | ✅ | — | 3 | — | — | Aeropuertos ⚠️ | RAP |
| AirportToId | Aeropuerto destino | ✅ | — | 4 | — | — | Aeropuertos ⚠️ | RAP |
| DepartureTime | Hora salida | — | — | 5 | — | — | — | RAP |
| ArrivalTime | Hora llegada | — | — | 6 | — | — | — | RAP |
| Distance | Distancia | — | — | 7 | _por definir_ | unidad: `DistanceUnit` | — | RAP |
| DistanceUnit | Medida | — | — | 8 | — | — | — | RAP |
| CarrierName | Nombre aerolínea | — | — | (título del detalle) | — | — | — | RAP |

### Vuelos (sección del detalle)

| Campo | Etiqueta | Filtro | Obligatorio | Columna (orden) | Medida | Texto de / Unidad | Value help | Origen |
|---|---|---|---|---|---|---|---|---|
| CarrierId | Id aerolínea | — | — | 1 | — | texto: `CarrierId_Text` | — | RAP |
| ConnectionId | Número vuelo | — | — | 2 | — | — | — | RAP |
| FlightDate | Fecha vuelo | — | — | 3 | — | — | — | RAP |
| Price | Precio vuelo | — | — | 4 | _por definir_ | moneda: `CurrencyCode` | — | RAP |
| PlaneTypeId | Tipo vuelo | — | — | 5 | — | — | — | RAP |
| SeatsMax | Capacidad máxima | — | — | 6 | _por definir_ | — | — | RAP |
| SeatsOccupied | Ocupación asientos | — | — | 7 | _por definir_ | — | — | RAP |
| CarrierName | Nombre aerolínea | — | — | 8 | — | — | — | RAP |

Pendientes para la Etapa 4: decidir medidas y totales (p. ej. `SUM` de `SeatsOccupied` / `SeatsMax`), si se cambia el orden de columnas y cómo se resuelve el value help de aeropuertos.

---

## Servicios Z utilizados (clean core flexible, D1)

| Servicio | Tipo | Motivo |
|---|---|---|
| `ZMAKS_SB_CONEXIONES` / `ZMAKS_SD_CONEXIONES` | RAP OData V4 (UI), propio | Servicio existente de un proyecto RAP anterior sobre el escenario de vuelos; no hay API liberada equivalente. |

---

## Decisiones

| ID | Decisión | Regla afectada | Si fuera al revés |
|---|---|---|---|
| D1 | **Clean core flexible**: se aceptan servicios RAP Z expuestos por OData cuando el cliente requiere algo no liberado; nunca RFC ni tablas directas. | Regla técnica 10 de CLAUDE.md | Con clean core estricto este reporte no podría usar `ZMAKS_SB_CONEXIONES` y habría que buscar o pedir una API liberada. |
| D2 | Migrar el proyecto a **TypeScript** antes de crecer (hoy solo existe un handler). | Regla técnica 9 | Seguir en JS dejaría la plantilla de reportes fuera del estándar del equipo y la migración costaría más después. |
| D3 | **Prueba de mutación solo para R2 (solo lectura) y R3 (autorización)**. | Regla técnica 14 | Mutar todas las reglas añade tiempo sin mucho valor en un reporte de solo lectura; no mutar ninguna dejaría sin verificar las dos reglas cuyo fallo es más grave. |
| D4 | No usar modo `hybrid` para datos reales desde BAS; validar datos reales **solo desplegado**. | Proceso / R5 | Seguir con `hybrid` + túnel SSH: ya probado el 2026-11-09, las peticiones no llegan al Cloud Connector. |
| D5 | `cds.remote.native_fetch: false` para forzar SAP Cloud SDK. | R4, R5 | Con native fetch las destinations OnPremise ignoran el proxy de connectivity y la llamada sale directo al host interno (`ENOTFOUND`). |
| D6 | Tests con `cds.test` sobre `node:test` + `tsx` (sin Jest). | Regla técnica 13 | Con Jest: más dependencias y configuración extra para ESM + TypeScript. |
| D7 | **Cada reporte es un proyecto CAP independiente** (repo, despliegue y proyecto de Claude propios). Decisión del usuario. | Estructura / Etapa 7 | Con varios reportes en un mismo proyecto: un despliegue afectaría a todos, y se mezclarían paquetes, permisos y ciclos de vida que el cliente maneja por separado. |
| D8 | La tabla **Semántica del reporte** es la fuente de verdad de las anotaciones; si el servicio origen no trae anotaciones, se definen en CAP (`annotations.cds`), no en el backend. Decisión del usuario. | R9, R11 | Si las anotaciones se pidieran siempre al backend, cada cambio de presentación dependería de un transporte en S/4 y los reportes sobre servicios "pelados" quedarían bloqueados. |
