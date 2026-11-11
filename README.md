# reporte-simple

> Borrador: se completa en el paso 4 de la Etapa 6.

## Configuración

El repositorio no contiene datos de ningún sistema real. Los valores propios de cada instalación aparecen como **marcadores** en la documentación (`CLAUDE.md`, `SPEC.md`, `PLAN.md`, `ESTADO.md`, `test/PRUEBAS_MANUALES.md`) y se configuran fuera del código:

| Marcador | Qué es | Dónde se configura |
|---|---|---|
| `<S4_HOST>:<S4_PUERTO>` | Host interno y puerto HTTP del S/4HANA on‑premise | **Cloud Connector**: mapeo del host virtual al interno, con el recurso `/sap/opu/odata` (*Path and all sub-paths*). En BTP, la **URL** de la destination apunta al host virtual. |
| `<S4_SISTEMA>` | Nombre del sistema S/4 | Solo documentación (pruebas y decisiones). |
| `<S4_CLIENTE>` | Mandante del S/4 | Propiedad adicional `sap-client` de la destination (si no, el cliente por defecto del sistema). |
| `<CF_API>`, `<CF_ORG>` | Endpoint de la API y org de Cloud Foundry (space `dev`) | `cf login -a <CF_API> -o <CF_ORG> -s dev --sso` antes de `cf deploy`. |
| `<URL_APP>` | URL de la app desplegada (managed app router) | La genera BTP: *HTML5 Applications* del subaccount, o `https://<subdominio>.launchpad.cfapps.<región>.hana.ondemand.com/<GUID>.reportesimple.conexiones-0.0.1/index.html`. |

Las credenciales nunca están en el repo: la destination de BTP guarda el usuario técnico (regla técnica 11), y `.cdsrc-private.json`, `default-env.json`, `*.mtaext` y `LOCAL.md` están en `.gitignore`.
