# ESTADO.md — reporte-simple

Resumen corto para retomar una sesión (D57). La fuente completa es `PLAN.md`; las decisiones, `SPEC.md`.

**Actualizado:** 2026-11-11

| | |
|---|---|
| Etapa activa | **5 — Despliegue a Cloud Foundry** (rama `etapa-5-despliegue`) |
| Plan | 6 pasos, aprobado por el usuario de una vez (2026-11-11) |
| Decisiones de la etapa | D53 rol `Visualizador` · D54 managed app router · D55 instancias `reporte-simple-*` · D56 sin transporte de D45 (mismo `<S4_SISTEMA>`/<S4_CLIENTE>; transportar antes de QAS/PRD) · D57 este archivo · D58 UI5 de Work Zone · D59 nombres de Work Zone · D60 build por defecto · D61 512 MB · D62 401 de XSUAA como excepción de R10 |

## Pasos

| # | Paso | Estado |
|---|---|---|
| 1 | `mta.yaml` + `xs-security.json` + rol `Visualizador` (R3) | ✅ |
| 2 | Despliegue de la app Fiori (HTML5 repo, `xs-app.json`, UI5) | ✅ |
| 3 | `cds build --production` revisado | ✅ |
| 4 | `mbt build` → **aprobación del usuario** → `cf deploy` | ✅ desplegado 2026-11-11 (instancias nuevas, cuota OK); redeploy a 512 MB hecho (D61: 81,7/512 MB) |
| 5 | Pruebas contra el RAP real (datos, R7, R14, 401/403, Cloud Connector) | 🟡 401 ✔ (D62); esperando pruebas del usuario |
| 6 | R13 en Work Zone / Launchpad | ⏸ postergado por el usuario |

## Último resultado

`npm test` 182/182 · `npm run test:mutacion` 2/2 (paso 1).

## Esperando al usuario

- Resultados de las pruebas C1–C8 en el navegador (403 sin rol → asignar `ReporteSimple_Visualizador` → datos reales, R7, R14, F4, R12/R13, Cloud Connector Monitor)

App: `<URL_APP>`
