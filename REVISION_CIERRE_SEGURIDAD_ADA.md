# Revisión de cierre de seguridad ADA

Cambios aplicados en este parche:

1. `dashboard.html` ahora carga `ada-security.js` antes de `dashboard.js`.
2. Se agregó protección visual para `role-loading`, evitando que se vea contenido antes de validar sesión y rol.
3. Los módulos no habilitados por rol se ocultan por completo en dashboard y menú.
4. `ada-security.js` ahora detiene la ejecución de módulos cuando el usuario no tiene permiso, evitando consultas posteriores del JS de cada pantalla.
5. El login redirige según rol: docente, preceptor, familia y alumno van directamente a su espacio correspondiente.
6. Se corrigieron colores por rol: docente naranja, preceptor marrón/dorado claro, directivo rojo, secretaría celeste, familia verde, admin oscuro y alumno multicolor.
7. Se agregó botón/flujo de cierre de sesión robusto.
8. Se agregó `assets/js/materias.js`, que estaba referenciado por `materias.html` pero no existía en el ZIP.
9. Se agregaron tarjetas de “Mi espacio”, Comunicados e Importación al dashboard, visibles solo cuando corresponden al rol.

Nota: el archivo `assets/js/supabase-config.js` no fue modificado.
