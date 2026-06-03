# ADA Bloque 27B - Corrección Programas y Bibliografía

Este ajuste corrige la carga de la pantalla `programas.html` cuando el módulo no encontraba `window.adaReady` y mostraba el error `Cannot read properties of undefined (reading 'perfil')`.

## Qué corrige

- La pantalla Programas ahora toma el contexto de sesión desde `adaReady`, `obtenerSesionPerfil()` o `adaRequirePageAccess()`, según lo disponible.
- Evita el error de perfil indefinido.
- Aclara visualmente que el docente puede adjuntar el programa en PDF, Word o imagen.
- Aclara que la bibliografía/recurso puede cargarse como PDF, Word o imagen, o solo con link externo.

## Archivos incluidos

- `assets/js/programas.js`
- `pages/programas.html`

No requiere ejecutar SQL nuevo si ya se aplicó el SQL del Bloque 27.
