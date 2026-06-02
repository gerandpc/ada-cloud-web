# ADA Cloud Web - Bloque 25

## Calificaciones y boletines

Este bloque incorpora las pantallas iniciales de calificaciones y boletines, recuperando una de las funciones centrales del ADA viejo.

### Archivos

- `pages/calificaciones.html`
- `pages/boletines.html`
- `assets/js/calificaciones.js`
- `assets/js/boletines.js`
- `assets/css/bloque25-calificaciones-boletines.css`
- `docs/sql/ada_bloque_25_calificaciones_boletines.sql`

### Antes de probar

Ejecutar el SQL en Supabase: `docs/sql/ada_bloque_25_calificaciones_boletines.sql`.

### Roles

- Admin/directivo/docente: pueden crear evaluaciones y cargar notas.
- Secretaría/docente/admin/directivo: pueden generar boletines.
- Preceptoría, familia y alumno: pueden consultar según permisos y RLS.

### Nota

El bloque queda preparado como base funcional inicial. En una próxima iteración conviene endurecer RLS por vínculo real: docente-materia, alumno propio y familia-alumno.
