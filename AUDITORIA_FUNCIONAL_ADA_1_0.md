# Auditoría funcional ADA 1.0

Fecha de revisión: 2 de agosto de 2026  
Base revisada: `ada-cloud-web-main (2).zip`

## Alcance y límite de la revisión

Se revisaron las 45 páginas HTML, 50 módulos JavaScript, la matriz de acceso por rol, los menús, las referencias internas, los flujos visibles y las consultas a Supabase presentes en el frontend.

Esta revisión permite verificar la coherencia del código cliente. **No permite certificar las políticas RLS de Supabase**, porque el ZIP no contiene el esquema SQL completo ni las políticas de la base. La separación real de datos debe validarse también dentro de Supabase.

## Estado general

| Área | Estado | Evaluación |
|---|---|---|
| Autenticación y sesión | ✔ Terminado | Login, sesión, perfiles activos, cierre de sesión y redirección por rol están implementados. |
| Control de páginas por rol | ✔ Terminado | Existe denegación por defecto para páginas no declaradas. |
| Menús por rol | ✔ Terminado | La matriz de módulos coincide con la matriz de páginas revisada. |
| Aislamiento real de datos | ⚠ Mejorable | Depende de RLS y vistas de Supabase; no se puede certificar solo con el frontend. |
| Programas | ✔ Funcional | Borrador, revisión, observación, aprobación y publicación están contemplados. |
| Actividades y entregas | ✔ Funcional | Creación, entrega y revisión están contempladas. |
| Calificaciones | ✔ Funcional | Carga y libro de calificaciones existen; debe probarse el cierre completo con datos reales. |
| Asistencia | ✔ Funcional | Registro, historial y alertas existen. |
| Boletines y cierres | ⚠ Mejorable | Hay módulos y generación, pero falta prueba integral con períodos y datos reales. |
| Comunicados | ✔ Funcional | Gestión, destinatarios y lecturas están contemplados. |
| Documentación familiar | ✔ Funcional | Carga, revisión y devoluciones están contempladas. |
| Auditoría y logs | ⚠ Mejorable | Pantallas existen; falta verificar que las tablas y políticas registren todas las acciones. |
| Exportaciones contextuales | ⚠ Mejorable | Existen en 13 vistas; faltan módulos específicos detallados más abajo. |
| IA | ⚠ Mejorable | El módulo existe y depende de configuración externa/función Edge. |
| Manuscritos | ❌ No operativo | La pantalla está deshabilitada y la página queda bloqueada por no estar declarada en permisos. |
| Responsive y accesibilidad | ⚠ Mejorable | La estructura es responsive, pero requiere prueba manual en móvil y teclado. |

## Revisión por rol

### Administrador

**Puede acceder:** gestión institucional, usuarios, roles, estructura académica, importaciones, módulos académicos, reportes, auditoría, logs y estado del sistema.

**Estado:** ✔ Completo para administración general.

**Pendiente:**
- verificar en Supabase que solo el administrador pueda ejecutar altas masivas y operaciones sensibles;
- registrar en auditoría las altas, bajas, cambios de rol e importaciones;
- agregar exportación específica de auditoría y estado del sistema.

### Directivo

**Puede acceder:** dashboard, institución, personal, alumnos, familias, estructura académica, programas, actividades, entregas, asistencia, calificaciones, cierres, boletines, reportes, convivencia y auditoría.

**Estado:** ✔ Funcional.

**Pendiente:**
- confirmar con datos reales que los programas pendientes aparezcan en el panel;
- validar que las aprobaciones registren usuario, fecha y observación;
- agregar informe ejecutivo contextual en PDF, no impresión de pantalla;
- revisar si debe poder editar usuarios o solo consultarlos.

### Secretaría

**Puede acceder:** institución, usuarios, docentes, preceptoría, alumnos, familias, asignaciones, cursos, materias, documentación, asistencia, calificaciones, planillas, cierres, boletines y reportes.

**Estado:** ✔ Funcional.

**Pendiente:**
- completar certificados y constancias si forman parte del alcance final;
- verificar bajas lógicas y trazabilidad;
- agregar exportación de matrículas, documentación pendiente y cierres.

### Docente

**Puede acceder:** su espacio, cursos, materias, programas, actividades, entregas, documentos, IA, asistencia, calificaciones, libro, reportes, comunicados y ficha de alumno.

**Estado:** ✔ Funcional.

**Riesgo a validar:** las vistas `v_docente_mis_alumnos`, `v_docente_mis_materias` y los reportes deben filtrar en Supabase por `auth.uid()`.

**Pendiente:**
- comprobar que solo vea alumnos y materias asignados;
- probar programa → revisión → aprobación → publicación;
- agregar exportación de consigna, correcciones y lista de curso;
- definir si la ficha integral muestra campos reservados que no correspondan al docente.

### Preceptor

**Puede acceder:** su espacio, alumnos, familias, asignaciones, cursos, documentos, documentación, asistencia, libres por materia, reportes y comunicados.

**Estado:** ✔ Funcional.

**Pendiente:**
- verificar que `v_preceptor_cursos_resumen` limite los cursos asignados;
- agregar planilla diaria contextual de asistencia y reporte de inasistencias;
- revisar si debe acceder a todos los datos familiares o solo contactos necesarios.

### Alumno

**Puede acceder:** su espacio, programas, actividades, entregas, boletines, documentos, documentación, IA y comunicados.

**Estado:** ✔ Funcional.

**Riesgo a validar:** `v_alumno_mi_curso`, `v_alumno_mis_materias`, asistencia, seguimientos y boletines deben devolver únicamente el usuario autenticado.

**Pendiente:**
- calendario académico unificado;
- descarga contextual de programa, actividad, devolución y boletín;
- comprobar que solo vea calificaciones publicadas;
- ocultar toda observación interna no habilitada.

### Familia

**Puede acceder:** su espacio, programas, boletines, documentos, documentación, IA y comunicados.

**Estado:** ✔ Funcional.

**Riesgo a validar:** `v_familia_hijos` debe ser la única fuente de vínculo y estar protegida por RLS.

**Pendiente:**
- justificar inasistencias dentro de un flujo formal;
- seleccionar claramente al hijo cuando hay más de uno;
- descargar boletines y documentación individual;
- confirmar que solo se publiquen seguimientos autorizados.

## Coherencia de los circuitos pedagógicos

### Programa docente

1. El docente crea o edita un borrador. ✔
2. Lo envía a revisión. ✔
3. El directivo puede aprobar u observar. ✔
4. El programa aprobado queda publicado. ✔ en el código.
5. Alumno y familia consultan solo aprobados. ✔ en la lógica visible.
6. Historial completo de versiones. ⚠ Parcial: existe versión/nueva versión, pero debe validarse la conservación de todas las versiones en base.

### Actividad y entrega

1. El docente crea y publica la actividad. ✔
2. El alumno asignado la visualiza. ✔
3. El alumno entrega archivo o contenido. ✔
4. El docente revisa y devuelve. ✔
5. La devolución y calificación se visualizan. ✔ en el código.
6. Integración automática con libro de calificaciones. ⚠ No queda demostrada como circuito automático completo.

### Calificaciones y boletín

1. El docente carga notas. ✔
2. Secretaría/directivo controlan planillas y cierre. ✔
3. Se generan boletines y actas. ✔
4. Alumno y familia ven solo publicaciones habilitadas. ✔ en la lógica visible.
5. Bloqueo posterior al cierre. ⚠ Debe validarse con constraints/policies SQL.

### Asistencia

1. Docente o preceptor registran asistencia. ✔
2. Se genera historial y alertas. ✔
3. Familia consulta asistencia. ✔
4. Familia presenta justificación. ⚠ No se identifica un circuito completo y explícito de validación de justificaciones.
5. Secretaría valida documentación. ⚠ Requiere completar o confirmar integración con documentación.

## Seguridad y privacidad

### Correcto en el frontend

- Todas las páginas autenticadas cargan `ada-security.js`.
- Las páginas no declaradas quedan bloqueadas por defecto.
- El dashboard redirige a los roles operativos a su portal correspondiente.
- La matriz de menú y la matriz de acceso no presentan contradicciones detectadas.
- No se encontraron referencias locales rotas en HTML.

### No certificable sin SQL de Supabase

- Row Level Security por tabla.
- Policies de vistas y funciones.
- Separación multiinstitución.
- Restricción de archivos de Storage.
- Impedimento de modificar registros mediante llamadas directas a la API.
- Auditoría real de todas las operaciones.

**Conclusión de seguridad:** el frontend está organizado correctamente, pero ADA no debe considerarse completamente seguro para datos reales hasta auditar RLS tabla por tabla.

## Textos provisorios y elementos no terminados

Se detectaron mensajes internos que deben corregirse antes de producción:

- `actividades.js` y `entregas.js`: mensajes que mencionan “Bloque 26” y un archivo SQL interno.
- `documentacion.js`: mensajes que mencionan “Bloque 28”.
- `documentacion.js`: comentario visible en código “ADA Cloud Web - Bloque 28”.
- `manuscritos.html`: módulo deshabilitado; debe eliminarse del producto o completarse.
- Algunos archivos Markdown de bloques permanecen en la raíz. Son documentación técnica y no afectan la web, pero conviene moverlos a `/docs`.

Los `placeholder` de campos de formulario son ejemplos válidos de carga y no se consideran textos provisorios.

## Exportaciones contextuales

### Ya implementadas

- Usuarios.
- Alumnos.
- Docentes.
- Directivos.
- Preceptoría.
- Familias.
- Cursos.
- Materias.
- Asistencia.
- Calificaciones.
- Reportes.
- Boletines.
- Programa individual.

### Faltan o deben mejorarse

- Lista de alumnos por curso, filtrada por curso seleccionado.
- Asignaciones docentes y familiares.
- Actividad/consigna individual.
- Entrega y devolución individual.
- Planilla diaria de asistencia.
- Acta de cierre académico.
- Boletín individual con formato institucional.
- Comunicado individual.
- Ficha integral del alumno con control de datos sensibles.
- Documentación pendiente por alumno/familia.
- Auditoría y logs.
- Informe ejecutivo del directivo.

## Incidencias prioritarias

### Críticas

1. Auditar RLS y políticas de Supabase antes de cargar información real.
2. Verificar que vistas de alumno, familia, docente y preceptor filtren por `auth.uid()`.
3. Probar bloqueo de cambios después de cierres académicos.
4. Verificar permisos de Storage para actividades, entregas y documentación.

### Importantes

1. Completar exportaciones contextuales faltantes.
2. Eliminar mensajes visibles que mencionan números de bloque o SQL interno.
3. Completar justificación de inasistencias.
4. Probar todos los circuitos con una cuenta real por rol.
5. Confirmar historial de versiones de programas.

### Menores

1. Mover documentación técnica de la raíz a `/docs`.
2. Retirar o completar Manuscritos.
3. Revisar accesibilidad con teclado y lector de pantalla.
4. Probar diseño en teléfonos y tabletas reales.

## Veredicto ADA 1.0

**Estado actual: candidato funcional avanzado, no todavía producción certificada.**

- ✔ La estructura funcional y los roles están ampliamente desarrollados.
- ✔ Los circuitos académicos principales existen.
- ⚠ Falta validar la seguridad real de Supabase.
- ⚠ Faltan exportaciones contextuales específicas.
- ⚠ Faltan pruebas integrales con datos reales y una cuenta por rol.
- ❌ Manuscritos no está operativo.

ADA puede mostrarse como demostración institucional. Para operar con datos personales reales, deben cerrarse primero las incidencias críticas indicadas.
