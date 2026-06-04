# ADA Cloud Web - Bloque 31
## Cierre académico, boletines y actas

### Objetivo
Cerrar el circuito académico iniciado en el Bloque 25C.

### Incluye
- `pages/cierres-academicos.html`
- `pages/boletines-actas.html`
- `assets/js/cierres-academicos.js`
- `assets/js/boletines-actas.js`
- `assets/css/bloque31-cierres.css`
- `assets/js/ada-security.js`
- `docs/sql/ada_bloque_31_cierre_academico_boletines_actas.sql`

### Funciones
- Registrar cierres por curso, materia e instancia.
- Instancias: bimestres, cuatrimestres, diciembre, febrero y anual.
- Generar estados académicos iniciales por alumno.
- Generar boletines por curso.
- Generar actas académicas.
- Consultar boletines, actas y estados.
- Exportar tablas a Excel.

### Roles
- Secretaría, Directivo y Admin: gestionan cierres, boletines y actas.
- Familia y Alumno: pueden consultar boletines/estados.
- Docente: sigue trabajando desde Calificaciones/Planillas.

### SQL
Ejecutar en Supabase:

`docs/sql/ada_bloque_31_cierre_academico_boletines_actas.sql`
