# ADA Cloud Web — Bloque 24
## Base visual, navegación y permisos por rol

Este bloque deja definida la base madre de ADA para que los próximos módulos recuperados del ADA viejo entren con la misma identidad visual, navegación y seguridad.

## Objetivo

ADA deja de funcionar como suma de pantallas sueltas y pasa a comportarse como una plataforma escolar cerrada por rol.

## Cambios aplicados

### 1. Navegación única

Se unifica el menú lateral para todas las páginas internas. El menú se genera desde `assets/js/ada-security.js` según el rol real del usuario en Supabase.

### 2. Permisos visuales reales

Los módulos no permitidos ya no se muestran. El cartel de acceso restringido queda solo para intentos de ingreso por URL directa.

### 3. Portal como entrada oficial

El cierre de sesión y las redirecciones sin sesión vuelven al `index.html`, que funciona como portal visual de acceso ADA.

### 4. Colores por rol

- Admin: oscuro institucional.
- Directivo: rojo.
- Secretaría: celeste.
- Docente: naranja.
- Preceptoría: dorado/marrón claro.
- Familia: verde.
- Alumno: multicolor.

### 5. Responsive real

En pantallas chicas aparece botón flotante de menú. El menú lateral se abre como panel deslizable y las tarjetas/tablas/formularios se adaptan al ancho del dispositivo.

### 6. Base estética para futuros módulos

Quedan normalizados:

- tarjetas;
- botones;
- tablas;
- paneles;
- formularios;
- mensajes;
- menú;
- cabeceras;
- colores por rol.

## Matriz de navegación vigente

| Módulo | Admin | Directivo | Secretaría | Docente | Preceptoría | Familia | Alumno |
|---|---:|---:|---:|---:|---:|---:|---:|
| Dashboard institucional | Sí | Sí | Sí | No | No | No | No |
| Mi espacio docente | No | No | No | Sí | No | No | No |
| Mi espacio preceptor | No | No | No | No | Sí | No | No |
| Mi espacio familia | No | No | No | No | No | Sí | No |
| Mi espacio alumno | No | No | No | No | No | No | Sí |
| Institución | Sí | Sí | Sí | No | No | No | No |
| Usuarios | Sí | Sí | Sí | No | No | No | No |
| Directivos | Sí | Sí | No | No | No | No | No |
| Secretaría | Sí | Sí | Sí | No | No | No | No |
| Docentes | Sí | Sí | Sí | No | No | No | No |
| Preceptoría | Sí | Sí | Sí | No | Sí | No | No |
| Alumnos | Sí | Sí | Sí | Sí | Sí | No | No |
| Familias | Sí | Sí | Sí | No | Sí | No | No |
| Cursos | Sí | Sí | Sí | Sí | Sí | No | No |
| Materias | Sí | Sí | Sí | Sí | No | No | No |
| Asignaciones | Sí | Sí | Sí | No | Sí | No | No |
| Asistencia | Sí | Sí | Sí | Sí | Sí | No | No |
| Comunicados | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Documentos | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| ADA IA | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| Reportes | Sí | Sí | Sí | Sí | Sí | No | No |
| Horarios | Sí | Sí | Sí | No | No | No | No |
| Manuscritos | Sí | Sí | Sí | Sí | No | No | No |
| Importaciones | Sí | No | No | No | No | No | No |

## Próximo paso recomendado

Después de probar este bloque por rol, avanzar con:

1. Bloque 25 — Calificaciones y boletines.
2. Bloque 26 — Tareas, actividades y entregas.
3. Bloque 27 — Justificaciones, tardanzas y retiros.
4. Bloque 28 — Alertas, incidentes y seguimiento.
5. Bloque 29 — Programas de materia y cierres de período.
6. Bloque 30 — Mensajería familia-escuela.
