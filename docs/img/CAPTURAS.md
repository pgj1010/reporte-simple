# Capturas del README

El `README.md` espera estos tres archivos en esta carpeta:

| Archivo | Qué muestra |
|---|---|
| `lista-conexiones.png` | List Report de Conexiones con columnas, filtros de aeropuerto y textos de aerolínea |
| `detalle-conexion.png` | Object Page de una conexión: cabecera con **Asientos ocupados** y **Capacidad** (R14) y la tabla de vuelos (R7) |
| `f4-aeropuertos.png` | Diálogo del value help de aeropuertos (R8, D50) |

## Pasos (en local, con datos simulados)

1. `npm run watch` (sin perfil: CAP usa los CSV de `test/data/`, **no** el S/4).
2. Abrir `http://localhost:4004/conexiones/webapp/index.html` (en BAS: `Ctrl+Shift+P` → *Ports: Preview* → 4004). Usuario **`alice`**, sin contraseña.
3. **Lista:** pulsar **Ir** → captura `lista-conexiones.png`.
4. **Detalle:** abrir **AA 0017** → captura `detalle-conexion.png`, con la cabecera y la tabla de vuelos visibles.
5. **F4:** volver a la lista, abrir el value help de *Aeropuerto salida* → captura `f4-aeropuertos.png`.
6. Guardar como PNG (ancho ~1400 px) en `docs/img/`.

## Antes de commitear: revisar que no se vean datos reales

- [ ] La barra de direcciones muestra `localhost` o la URL de *Ports: Preview* de BAS, **nunca** la URL de la app desplegada (`launchpad.cfapps…`). Si es la de BAS, recórtala: incluye el ID del workspace.
- [ ] Los datos son los del mock: **5 conexiones** (AA 0017, LH 0402…), no las del S/4.
- [ ] No aparecen pestañas, marcadores ni otras ventanas con nombres de la empresa, del sistema, del subaccount o de usuarios.
- [ ] El usuario que se ve (si aparece) es `alice`.
