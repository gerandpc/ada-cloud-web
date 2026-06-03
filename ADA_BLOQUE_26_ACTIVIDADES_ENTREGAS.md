# ADA Cloud Web — Bloque 26
## Actividades, tareas y entregas

Este bloque recupera del ADA viejo la lógica de **actividades/tareas** y **entregas de alumnos**, manteniendo la base visual y de navegación definida en el Bloque 24.

## Archivos incluidos

```text
pages/actividades.html
pages/entregas.html
assets/js/actividades.js
assets/js/entregas.js
assets/css/bloque26-actividades-entregas.css
assets/js/ada-security.js
docs/sql/ada_bloque_26_actividades_entregas.sql
docs/ADA_BLOQUE_26_ACTIVIDADES_ENTREGAS.md
```

## SQL necesario

Antes de probar el módulo, ejecutar en Supabase SQL Editor:

```text
docs/sql/ada_bloque_26_actividades_entregas.sql
```

Crea:

```text
actividades
entregas_actividades
```

## Permisos iniciales

### Actividades

- Admin, directivo y docente pueden crear actividades.
- Admin/directivo pueden borrar.
- Todos los roles autenticados pueden consultar actividades publicadas.

### Entregas

- Alumno puede crear/actualizar su entrega.
- Docente/admin/directivo pueden revisar entregas.
- Todos los roles autenticados pueden consultar como base inicial.

> Nota: las políticas RLS están preparadas como base funcional. Cuando se cierre la relación fina alumno-curso-familia-docente, conviene endurecer la lectura para que familia vea solo sus hijos, docente sus cursos/materias y alumno solo lo propio.

## Navegación agregada

Se incorporan al menú lateral:

```text
Actividades
Entregas
```

Roles con acceso:

```text
admin
directivo
secretaria
docente
preceptor
familia
alumno
```

La pantalla ajusta las acciones según rol:

- Docente/admin/directivo: crean actividades y revisan entregas.
- Alumno: consulta actividades y realiza entregas.
- Familia/preceptoría/secretaría: consultan seguimiento.

## Qué queda preparado para el Bloque 27

El Bloque 27 debería recuperar del ADA viejo:

```text
justificaciones de asistencia
tardanzas
retiros
movimientos de preceptoría
```

