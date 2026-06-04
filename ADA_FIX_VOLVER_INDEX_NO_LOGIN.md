# ADA Cloud Web - Fix volver al index

## Problema corregido
Al cerrar sesión o al perder sesión, algunos roles volvían a `pages/login.html`, que era el login viejo.

## Decisión
La única entrada oficial de ADA es ahora `index.html`, con el portal visual por rol.

## Archivos incluidos
- `assets/js/ada-security.js`
- `assets/js/login.js`
- `pages/login.html`

## Qué cambia
- `adaLogout()` vuelve siempre al portal.
- Si una página interna no tiene sesión, vuelve al portal.
- Si alguien entra manualmente a `pages/login.html`, se redirige automáticamente a `../index.html`.
- El login viejo queda deshabilitado como pantalla principal.

## Commit sugerido
`Fix - Volver siempre al portal ADA`
