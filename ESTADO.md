# ESTADO.md — reporte-simple

Resumen corto para retomar una sesión (D57). La fuente completa es `PLAN.md`; las decisiones, `SPEC.md`.

**Actualizado:** 2026-11-11

| | |
|---|---|
| Etapa activa | **5 — Despliegue a Cloud Foundry ✅ cerrada** (rama `etapa-5-despliegue`), **esperando revisión y merge a `main`**; después, Etapa 6 |
| Plan | 6 pasos, aprobado por el usuario de una vez (2026-11-11) |
| Decisiones de la etapa | D53 rol `Visualizador` · D54 managed app router · D55 instancias `reporte-simple-*` · D56 sin transporte de D45 (mismo `<S4_SISTEMA>`/<S4_CLIENTE>; transportar antes de QAS/PRD) · D57 este archivo · D58 UI5 de Work Zone · D59 nombres de Work Zone · D60 build por defecto · D61 512 MB · D62 401 de XSUAA como excepción de R10 · D63 llamadas al RAP en los logs |

## Pasos

| # | Paso | Estado |
|---|---|---|
| 1 | `mta.yaml` + `xs-security.json` + rol `Visualizador` (R3) | ✅ |
| 2 | Despliegue de la app Fiori (HTML5 repo, `xs-app.json`, UI5) | ✅ |
| 3 | `cds build --production` revisado | ✅ |
| 4 | `mbt build` → **aprobación del usuario** → `cf deploy` | ✅ desplegado 2026-11-11 (instancias nuevas, cuota OK); redeploy a 512 MB hecho (D61: 81,7/512 MB) |
| 5 | Pruebas contra el RAP real (datos, R7, R14, 401/403, Cloud Connector) | ✅ datos reales, 403, R7, R14 (`AA 0015` 520 · 350), F4, decimales (usuario); 401 y logs (Claude) |
| 6 | R13 en Work Zone / Launchpad | ⏸ postergado por el usuario (pendiente) |

## Último resultado

`npm test` 182/182 · `npm run test:mutacion` 2/2 · `tsc` sin errores (cierre de la etapa).

## Esperando al usuario

- Revisión de la Etapa 5 (informe de cierre en `PLAN.md`) y merge a `main`
- Más adelante: paso 6 (Work Zone, R13) y transporte de D45 antes de QAS/PRD

App: `<URL_APP>`
