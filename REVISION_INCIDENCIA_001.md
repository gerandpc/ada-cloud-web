# ADA Gestión — Incidencia 001: permisos y arranque de seguridad

## Correcciones aplicadas

- Se eliminó una referencia a `adaExportCurrentViewToPdf` que no existía y podía detener la ejecución de `ada-security.js` con un `ReferenceError`.
- Preceptoría dejó de tener acceso al módulo general de **Asignaciones**. Las asignaciones institucionales quedan limitadas a Administración, Dirección y Secretaría.
- **Boletines y actas** quedó limitado a Administración, Dirección y Secretaría. Alumno y Familia deben consultar únicamente el módulo **Boletines**, que aplica los filtros de publicación y vinculación correspondientes.
- Se mantuvo la política de denegación por defecto para páginas no declaradas.

## Pruebas rápidas

1. Ingresar como preceptor y confirmar que no aparezca **Asignaciones**.
2. Intentar abrir directamente `pages/asignaciones.html` como preceptor: debe mostrar acceso restringido.
3. Ingresar como alumno o familia e intentar abrir `pages/boletines-actas.html`: debe mostrar acceso restringido.
4. Confirmar que el menú, el perfil y el cierre de sesión carguen normalmente en todos los roles.
5. Confirmar que no aparezca el botón flotante global **Guardar PDF**.
