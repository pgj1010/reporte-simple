# Capturas del README

`README.md` y `README.es.md` esperan estos cinco archivos en esta carpeta. **Todos los toma el usuario** (Claude no tiene navegador ni pantalla, D75). Ya están las cinco y los dos README las muestran; si se reemplaza alguna, mantener el mismo nombre de archivo (las referencias están en **los dos** README, D76).

| Archivo | Qué muestra |
|---|---|
| `lista-conexiones.png` | List Report de Conexiones con columnas, filtros de aeropuerto y textos de aerolínea |
| `detalle-conexion.png` | Object Page de una conexión: cabecera con **Asientos ocupados** y **Capacidad** (R14) y la tabla de vuelos (R7) |
| `f4-aeropuertos.png` | Diálogo del value help de aeropuertos (R8, D50) |
| `agente-claude-code.png` | Claude Code respondiendo la pregunta 3 del README con la tool `ocupacionPorConexion` (R16) |
| `inspector-cli.png` | MCP Inspector CLI: `tools/call ocupacionPorConexion` con `aerolinea=LH` y su JSON (D73) |

## Pasos (en local, con datos simulados)

1. `npm run watch` (sin perfil: CAP usa los CSV de `test/data/`, **no** el S/4).
2. Abrir `http://localhost:4004/conexiones/webapp/index.html` (en BAS: `Ctrl+Shift+P` → *Ports: Preview* → 4004). Usuario **`alice`**, sin contraseña.
3. **Lista:** pulsar **Ir** → captura `lista-conexiones.png`.
4. **Detalle:** abrir **AA 0017** → captura `detalle-conexion.png`, con la cabecera y la tabla de vuelos visibles.
5. **F4:** volver a la lista, abrir el value help de *Aeropuerto salida* → captura `f4-aeropuertos.png`.
6. Guardar como PNG (ancho ~1400 px) en `docs/img/`.

## Pasos de las capturas de MCP (terminal)

7. **Agente** (`agente-claude-code.png`): con `npm run watch` corriendo, en otra terminal: `claude "Dame la ocupación por conexión y dime cuál es la más alta."`. Aprobar la tool `ocupacionPorConexion` si Claude Code lo pide. Capturar la llamada a la tool **y** la respuesta (más alta `SQ 0001`, 96,8 %; `LH 0402` sin vuelos).
8. **Inspector** (`inspector-cli.png`): en una terminal, el comando 0 de *MCP — Inspector* (`test/PRUEBAS_MANUALES.md`) y luego `$I --header "$ALICE" --method tools/call --tool-name ocupacionPorConexion --tool-arg aerolinea=LH`. Capturar el comando y el JSON (`structuredContent` con 95.2 y `null`).
9. Terminal con fuente grande (≥ 16 px) y ancho suficiente para que el JSON no se corte.

## Antes de commitear: revisar que no se vean datos reales

- [ ] La barra de direcciones muestra `localhost` o la URL de *Ports: Preview* de BAS, **nunca** la URL de la app desplegada (`launchpad.cfapps…`). Si es la de BAS, recórtala: incluye el ID del workspace.
- [ ] Los datos son los del mock: **5 conexiones** (AA 0017, LH 0402…), no las del S/4.
- [ ] No aparecen pestañas, marcadores ni otras ventanas con nombres de la empresa, del sistema, del subaccount o de usuarios.
- [ ] El usuario que se ve (si aparece) es `alice`.
- [ ] **Capturas de terminal:** el prompt no muestra el nombre del Dev Space, del subaccount ni rutas con datos internos (si hace falta: `PS1='$ '` antes de capturar). No se ven `LOCAL.md`, `~/.claude.json`, `deploy/destination.mtaext` ni tokens. La cabecera `Basic YWxpY2U6` sí puede verse: es el usuario simulado `alice` sin contraseña.
