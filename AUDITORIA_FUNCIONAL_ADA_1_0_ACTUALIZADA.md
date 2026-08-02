# Auditoría funcional ADA 1.0 — estado actualizado

## Entrega actual

Se incorporó el **Centro de Inteligencia Institucional** para los roles Administrador y Directivo. El módulo utiliza exclusivamente datos visibles para la sesión activa y funciona de manera degradada cuando una tabla o vista no está disponible.

## Corrección confirmada

- Se eliminó del núcleo de seguridad la creación automática del botón flotante **Guardar PDF**.
- Las exportaciones deben permanecer asociadas a objetos concretos: programa, listado, acta, boletín, planilla o informe ejecutivo.

## Centro de Inteligencia Institucional

Incluye:

- matrícula activa;
- porcentaje de asistencia registrada;
- promedio general;
- alertas de trayectoria;
- programas aprobados;
- carga docente promedio;
- ausentismo por curso;
- rendimiento por materia;
- materias críticas;
- estudiantes con alertas;
- carga docente;
- filtros por curso, materia y período;
- generación de informe ejecutivo para PDF.

Las alertas son orientativas. Se calculan a partir de ausentismo, bajo desempeño y seguimientos prioritarios. No constituyen diagnósticos automáticos.

## Hallazgos pendientes de auditoría

### Críticos

1. Verificar políticas RLS de Supabase tabla por tabla. El frontend no permite certificar el aislamiento real de datos.
2. Revisar consultas que descargan conjuntos completos y filtran luego en el navegador.
3. Confirmar que las vistas `v_reporte_asistencia_detalle` y `v_reporte_seguimiento_detalle` respeten institución, rol y asignaciones.

### Importantes

1. Unificar la generación de documentos PDF contextuales.
2. Revisar textos visibles de desarrollo. La palabra `placeholder` aparece mayormente como atributo válido de formularios y no debe eliminarse de forma automática.
3. Revisar referencias a “Bloque” que permanecen dentro de código técnico y distinguirlas de textos visibles.
4. Verificar los circuitos completos de programas, actividades, entregas, calificaciones, asistencia y boletines con datos reales.
5. Agregar comparación interanual cuando existan ciclos lectivos y fechas homogéneas.

### Mejoras

1. Incorporar gráficos históricos cuando la base disponga de series temporales consistentes.
2. Integrar consultas en lenguaje natural cuando se habilite la API de IA.
3. Agregar exportación Excel en indicadores institucionales.
4. Incorporar umbrales configurables por institución.
