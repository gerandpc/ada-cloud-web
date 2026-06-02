# ADA Bloque 24/25 - Corrección de cierre de sesión

Se corrigió el problema por el cual, al cerrar sesión desde admin, el portal volvía a abrir el panel automáticamente.

Cambios principales:

- `portal-acceso.js` ya no redirige automáticamente si detecta una sesión previa.
- `ada-security.js` limpia sesión local de Supabase de forma defensiva antes de volver al portal.
- El logout vuelve a `index.html?logout=1`.
- El portal elimina el parámetro `logout` y queda visible para elegir rol.

Además se integraron las rutas y menú lateral para Bloque 25: Calificaciones y Boletines.
