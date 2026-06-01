# ADA Cloud Web - Patch 04 cierre de navegación por rol

Este parche corrige el punto detectado en pruebas: los espacios operativos de docente, alumno, familia y preceptoría entraban correctamente a su pantalla, pero no mostraban menú lateral unificado.

## Cambios aplicados

- Se agregó menú lateral propio en:
  - `pages/mi-espacio-docente.html`
  - `pages/mi-espacio-alumno.html`
  - `pages/mi-espacio-familia.html`
  - `pages/mi-espacio-preceptor.html`
- El menú lateral muestra solamente accesos compatibles con cada rol.
- Se eliminó la dependencia de un botón global superior para esos roles.
- Se corrigió el enlace de cierre de sesión para que funcione también en el espacio docente.
- Se reforzó `ada-security.js` para detectar menús laterales ya existentes, enlazar sus botones, aplicar layout lateral y filtrar módulos no permitidos.
- El enlace “Volver al panel” se reescribe como “Mi inicio” y apunta al inicio real de cada rol.

## Criterio funcional

- Admin, directivo y secretaría conservan dashboard institucional.
- Docente entra a `mi-espacio-docente.html` con menú lateral docente.
- Alumno entra a `mi-espacio-alumno.html` con menú lateral alumno.
- Familia entra a `mi-espacio-familia.html` con menú lateral familia.
- Preceptoría entra a `mi-espacio-preceptor.html` con menú lateral preceptoría.
- Las páginas no permitidas siguen bloqueadas si se accede por URL directa.

## Archivos incluidos

- `assets/js/ada-security.js`
- `assets/css/style.css`
- `pages/mi-espacio-docente.html`
- `pages/mi-espacio-alumno.html`
- `pages/mi-espacio-familia.html`
- `pages/mi-espacio-preceptor.html`
