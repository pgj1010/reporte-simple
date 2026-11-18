PLAN-MCP — Zero to Hero: reporte-simple como servidor MCP

Objetivo: que un agente de IA (Claude Code, y luego Joule u otros) pueda consultar los datos de reporte-simple en lenguaje natural a través de MCP. Formato: niveles 0 → 7. Cada nivel = una etapa del PLAN (una rama, merge tras revisión). Uso: copia este archivo a la raíz del proyecto en BAS y pídele a Claude Code: "Lee PLAN-MCP-ZERO-TO-HERO.md y ejecuta solo el Nivel N. Detente al terminar y muéstrame qué cambió."

Reglas de esta etapa (se suman al CLAUDE.md del proyecto)
Node.js en TypeScript, nunca Java.
Autorización solo con @requires / @restrict.
Una rama por nivel: feature/mcp-nivel-N. Merge solo tras revisión.
Nunca cf deploy sin aprobación explícita.
Todo se prueba en local con datos de prueba (cds watch). El acceso a S/4 real queda fuera de esta etapa.
Cada decisión se registra en SPEC.md / PLAN.md.
Nivel 0 — Entender (sin código, 20 min)

Qué es MCP: un estándar para que un modelo de IA use herramientas externas. Hay un cliente (Claude Code) y un servidor (tu app) que expone tools.

Hay dos piezas MCP de CAP, y son distintas:

Paquete	Para qué sirve	Quién lo usa
@cap-js/mcp-server (comando cds-mcp)	Ayudar a desarrollar: Claude busca en tu modelo CDS y en la documentación de CAP	Tú, mientras programas
@cap-js/mcp (adaptador, beta)	Convertir tu servicio en servidor MCP: el agente consulta datos	El agente, en ejecución

Las 3 tools que crea el adaptador:

describe: metadatos de entidades, acciones y funciones.
query: lectura de datos con un solo argumento, cql: una sentencia SELECT en CQL (p. ej. SELECT CarrierId, ConnectionId FROM Conexiones ORDER BY CarrierId). Se traduce a CQN y pasa por service.run(...), así que respeta tus handlers y autorizaciones. El LIMIT lo pone el servidor según @cds.query.limit.
call: llama acciones o funciones unbound (tool genérica). Con cds.mcp.per_action_tool: true, cada acción o función es una tool propia con su nombre (p. ej. ocupacionPorConexion) y su descripción.

Nota (corregido el 2026-11-18 con la evidencia del Nivel 5, test/PRUEBAS_MANUALES.md → "MCP — Inspector"): la versión original decía que query recibía entity, select, where, limit, orderBy, groupBy… y que la tool de funciones se llamaba call_action. El tools/list de @cap-js/mcp 1.5.0 muestra que query recibe solo cql y que la tool genérica se llama call. Las menciones a call_action de los Niveles 4 y 5 también se corrigieron, con su nota.

Límites que debes conocer (según la doc oficial):

Es de solo lectura: no hay CREATE, UPDATE ni DELETE; los cambios solo van por acciones.
No trae protección contra prompt injection ni validación de entrada o salida.
No tiene gobierno propio (rate limit, auditoría, aprobaciones). SAP recomienda el MCP Gateway de Integration Suite.
La doc indica que no debe usarse para hacer proxy de APIs de aplicación SAP. Por eso esta etapa usa datos de prueba. Ver Nivel 7.

✅ Criterio: sabes explicar en 1 minuto la diferencia entre las dos piezas.

Nivel 1 — Claude entiende tu proyecto (cds-mcp)

Rama: feature/mcp-nivel-1

bash
claude mcp add cds-mcp -- npx -y @cap-js/mcp-server

Agrega al CLAUDE.md:

- Para dudas de CAP o del modelo CDS, usa primero las tools del servidor MCP cds-mcp (search_model, search_docs) antes de suponer.

Prueba: pregúntale a Claude Code:

"¿Qué servicios CDS hay en este proyecto y dónde se sirven?"
"¿Qué entidades expone el servicio del reporte y cómo se relacionan?"

✅ Criterio: Claude responde usando search_model y no adivinando.

Nivel 2 — Tu servicio habla MCP (local)

Rama: feature/mcp-nivel-2

Instala el adaptador:
bash
npm add @cap-js/mcp
Anota el servicio del reporte (Claude Code debe descubrir su nombre real en srv/):
cds
annotate <ServicioReporte> with @mcp;
Arranca:
bash
cds watch

En el log busca la ruta MCP del servicio (algo como /mcp/<nombre>). 4. Con cds watch corriendo, CAP autoconecta el servidor a Claude Code con un usuario mock (solo para desarrollo). Si no se conecta, agrégalo a mano:

bash
claude mcp add --transport http reporte http://localhost:4004/mcp/<nombre>

Prueba (en otra terminal):

bash
claude "¿Qué datos expone el servicio del reporte? Muéstrame las 10 primeras conexiones."

✅ Criterio: Claude usa describe y luego query y devuelve datos de prueba reales del CSV.

Nivel 3 — Un servicio hecho para agentes

Exponer todo el servicio es mala práctica. Lo correcto es crear un servicio dedicado que proyecte solo lo necesario, con descripciones que el agente pueda leer.

Rama: feature/mcp-nivel-3

cds
// srv/agent-service.cds
using { <ServicioReporte> as src } from './<archivo-servicio>';

/** Servicio de solo lectura para agentes de IA: consultas sobre conexiones del reporte. */
@mcp
@requires: 'authenticated-user'
@readonly
service ReporteAgentService {

  /** Conexiones registradas. Usar para filtrar por <campos clave reales>. */
  entity Conexiones as projection on src.<EntidadConexiones> {
    <solo los campos útiles para el negocio>
  };
}

Luego quita @mcp del servicio original (Nivel 2). Los comentarios /** ... */ le dan contexto al agente: escríbelos en lenguaje de negocio.

✅ Criterio: el agente solo ve ReporteAgentService, no puede escribir y entiende para qué sirve cada campo.

Nivel 4 — Acciones de negocio (call o tool propia con per_action_tool)

Las preguntas frecuentes van mejor como funciones con lógica controlada, no como queries libres.

Rama: feature/mcp-nivel-4

cds
extend service ReporteAgentService with {
  /** Resumen por <criterio>: total de conexiones y <métrica>. */
  function resumenPor<Criterio>() returns array of {
    <criterio> : String;
    total      : Integer;
  };
}

Implementa el handler en TypeScript (srv/agent-service.ts) con un SELECT ... GROUP BY sobre la proyección.

Prueba: claude "Dame el resumen por <criterio> y dime cuál es el más alto".

✅ Criterio: Claude llama la función (por la tool genérica call, o por su tool propia si per_action_tool: true) y razona sobre el resultado.

Nota (corregido el 2026-11-18 con la evidencia del Nivel 5, test/PRUEBAS_MANUALES.md → "MCP — Inspector"): el original decía call_action; la tool genérica de @cap-js/mcp 1.5.0 se llama call.

Nivel 5 — Inspeccionar como profesional
bash
npx @modelcontextprotocol/inspector

Elige Streamable HTTP, conéctate a tu endpoint y prueba cada tool a mano (describe, query y call, o la tool propia de cada función con per_action_tool: true; en este proyecto, ocupacionPorConexion).

Nota (corregido el 2026-11-18 con la evidencia del Nivel 5, test/PRUEBAS_MANUALES.md → "MCP — Inspector"): el original decía call_action; el tools/list de @cap-js/mcp 1.5.0 muestra describe, query y ocupacionPorConexion (con per_action_tool: true).

✅ Criterio: sabes qué JSON recibe y devuelve cada tool. Esto te sirve para depurar y para entrevistas.

Nivel 6 — Demo para portafolio

Rama: feature/mcp-nivel-6

README (en inglés): problema, arquitectura (S/4 RAP → CAP → MCP → agente), cómo correrlo y capturas.
Diagrama de arquitectura en el README.
Video de 2–3 min:
15 s: "Business users ask questions; the agent queries SAP data through MCP."
Arrancar cds watch.
Hacer 3 preguntas en Claude Code: una simple, una con filtro y el resumen (acción).
Mostrar el Inspector con una tool.
Cierre: qué lo hace seguro (solo lectura, @requires, servicio dedicado).
Repo público en GitHub sin datos reales ni credenciales.

✅ Criterio: alguien de afuera clona el repo y lo corre en 5 minutos.

Nivel 7 — Hero: rumbo a producción (diseño, no ejecución)

Solo se documenta en SPEC.md. No se despliega sin aprobación.

Autenticación real: la conexión automática con usuario mock solo funciona en desarrollo. Hay que definir XSUAA/IAS y cómo se autentica el cliente MCP.
Gobierno: MCP Gateway de SAP Integration Suite (rate limit, auditoría, políticas).
Datos de S/4: revisar con el equipo la nota de la doc sobre no hacer proxy de APIs de aplicación SAP. Para ese caso, consultar las arquitecturas de referencia del SAP Architecture Center (o Joule Studio con conexiones MCP).
Joule: evaluar agente en Joule Studio con este servidor como herramienta, o agente pro-code vía A2A.
Riesgos: prompt injection (los datos que vuelven pueden contener texto malicioso) y exposición de datos sensibles. Mitigación: servicio dedicado, campos mínimos y @restrict por rol.

✅ Criterio: SPEC.md tiene una sección "MCP en producción" con decisiones y preguntas abiertas para tu jefe.