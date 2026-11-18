# Guion del video — reporte-simple con MCP (2–3 min)

Video de portafolio del Nivel 6 (`PLAN-MCP-ZERO-TO-HERO.md`). Narración **en inglés**; pantalla en local con **datos simulados** (`test/data/`). El Inspector se muestra en **modo CLI**, no la web (D75 punto 3).

> **Ojo, idioma de las respuestas:** `@mcp.instructions` de `ReporteAgentService` le pide al agente *"Responde en español"*, así que Claude Code contestará en español aunque la pregunta sea en inglés. Para el video: subtítulos en inglés, o preguntar en español y narrar en inglés. Cambiar la instrucción sería un cambio de código (fuera de este nivel).

## Antes de grabar

- [ ] `pkill -f "cds"` y luego **`npm run watch`** en la terminal 1 (un solo `cds watch`).
- [ ] Terminal 2 con las variables del Inspector (comando 0 de *MCP — Inspector* en `test/PRUEBAS_MANUALES.md`):
  ```bash
  URL=http://localhost:4004/mcp/reporte-agent
  I="npx -y @modelcontextprotocol/inspector --cli $URL --transport http"
  ALICE='Authorization: Basic YWxpY2U6'
  SINROL='Authorization: Basic c2lucm9sOg=='
  ```
- [ ] Correr una vez cada comando del guion para calentar la caché de `npx` (que no aparezca la descarga en el video).
- [ ] En Claude Code, el servidor MCP del reporte conectado (autoconexión de `npm run watch`) y **las tools de solo lectura aprobadas de antemano**, para que el aviso de permisos no corte la toma (y para no repetir la lección L1).
- [ ] Prompt corto (`PS1='$ '`), fuente grande, sin pestañas ni ventanas con datos internos. Revisar la lista de `docs/img/CAPTURAS.md` → *Antes de commitear*.
- [ ] Navegador en la app (`/conexiones/webapp/index.html`, usuario `alice`) con la lista ya cargada. Si se usa la URL de *Ports: Preview* de BAS, que no se vea la barra de direcciones (incluye el ID del workspace).
- [ ] Diagrama de arquitectura abierto (el Mermaid del README renderizado en GitHub o en la vista previa de Markdown).

## Guion (~2:40)

| Tiempo | Pantalla | Acción | Narración |
|---|---|---|---|
| 0:00–0:15 | Diagrama del README | — | "Business users ask questions; the agent queries SAP data through MCP. Read-only, with the same SAP role as the report." |
| 0:15–0:30 | Terminal 1 | Mostrar el log de `npm run watch`: `/odata/v4/reporte` y `/mcp/reporte-agent` | "One CAP service in TypeScript, two doors: OData for the Fiori app, MCP for AI agents. Here it runs locally with mock data." |
| 0:30–0:50 | Navegador | Lista de conexiones → abrir **AA 0017** (cabecera con 573 / 770 y sus 2 vuelos) | "This is the classic report. In production every read is delegated live to a custom RAP service in S/4HANA, and totals are computed by S/4 in one request." |
| 0:50–1:10 | Claude Code | **Pregunta 1 (simple):** "Which routes does Lufthansa operate?" | "A simple question. The agent discovers the model with `describe`, then queries connections and airports." |
| 1:10–1:30 | Claude Code | **Pregunta 2 (con filtro):** "What is the seat occupancy of AA 0017?" | "With a filter: two flights, 96.6 and 52.2 percent, using the formula from the service description." |
| 1:30–1:55 | Claude Code | **Pregunta 3 (resumen con la función):** "Show me the occupancy by connection. Which one is the highest?" | "For a business summary, the agent calls a dedicated read-only tool, `ocupacionPorConexion`. SQ 0001 is the fullest; LH 0402 has no flights, so its percentage is empty, not zero." |
| 1:55–2:15 | Terminal 2 | `$I --header "$ALICE" --method tools/call --tool-name ocupacionPorConexion --tool-arg aerolinea=LH` | "This is exactly what the agent receives: a text for the model, and structured JSON." |
| 2:15–2:25 | Terminal 2 | `$I --header "$ALICE" --method tools/call --tool-name ocupacionPorConexion --tool-arg "aerolinea=LH' or 1 eq 1"` | "Bad input is rejected before anything reaches SAP, with a message the agent can act on." |
| 2:25–2:35 | Terminal 2 | `curl -i -X POST $URL -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -H "$SINROL" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` → `403 Forbidden` | "No role, no data. Authorization is declarative CAP: `@requires`, no custom code." |
| 2:35–2:45 | README → *Security by design* | Desplazar por la tabla | "Read-only, role-protected, a dedicated service with minimal fields, 243 tests and 7 out of 7 mutations caught. Next step: real authentication with XSUAA and SAP's MCP Gateway." |

## Después de grabar

- [ ] Revisar el video cuadro a cuadro con la lista de *Antes de grabar*: sin URLs de BAS ni de la app desplegada, sin nombres de la empresa, del sistema ni del subaccount.
- [ ] Publicarlo fuera del repo (el `.mp4` no se versiona) y enlazarlo desde los dos README (D76).
