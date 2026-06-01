# ADA Cloud Web - Patch 02 de cierre de seguridad por rol

Este parche corrige el problema observado: un usuario docente seguía viendo el dashboard institucional completo y el menú con módulos no habilitados.

## Cambios principales

1. El dashboard institucional queda reservado a `admin`, `directivo` y `secretaria`.
2. Si un usuario operativo (`docente`, `preceptor`, `familia`, `alumno`) intenta entrar a `dashboard.html`, ADA lo redirige automáticamente a su espacio propio.
3. Los módulos no permitidos ya no se muestran en gris: se ocultan completamente con `display:none`.
4. El menú lateral también se filtra por rol; no deben aparecer enlaces como Directivos si el rol actual es docente.
5. Se agregó ocultamiento inicial con `role-loading` para evitar que el contenido sensible se vea antes de validar sesión y permisos.
6. El rol docente queda con identidad naranja como color base.
7. Se corrigió el orden de carga de scripts en `dashboard.html`: primero seguridad, luego sidebar, luego dashboard.

## Archivos modificados

- `assets/js/ada-security.js`
- `assets/js/dashboard.js`
- `assets/css/style.css`
- `pages/dashboard.html`
- páginas internas con `body class="role-loading"` cuando correspondía.

## Prueba esperada

- Usuario docente: debe entrar a `mi-espacio-docente.html`, con fondo naranja, sin ver Directivos/Secretaría/Usuarios como opciones.
- Si escribe manualmente `directivos.html`, debe aparecer acceso restringido.
- Si escribe manualmente `dashboard.html`, debe volver a su espacio docente.
- Admin/directivo/secretaría siguen pudiendo usar dashboard institucional según permisos.
