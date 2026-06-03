# ADA Cloud Web - Bloque 25B
## Planilla anual de calificaciones tipo Excel

Este ajuste transforma el módulo `Calificaciones` para que el docente no tenga que cargar alumno por alumno.

## Cambios principales

- Los alumnos aparecen en filas.
- Las notas aparecen en columnas, siguiendo el modelo de Excel enviado:
  - 1° Bimestre: Nota 1, Nota 2, Nota 3, Nota 4, Bimestre.
  - 1° Cuatrimestre: Nota 1, Nota 2, Nota 3, Nota 4, Primer Cuatrimestre.
  - 3° Bimestre: Nota 1, Nota 2, Nota 3, Nota 4, 3 Bimestre.
  - 2° Cuatrimestre: Nota 1, Nota 2, Nota 3, Nota 4, Segundo Cuatrimestre.
  - Diciembre.
  - Febrero.
- Se puede cargar toda la grilla y guardar en bloque.
- Al actualizar el cierre anual, ADA calcula cierres vacíos tomando las cuatro notas anteriores.
- La solapa Diciembre muestra solo alumnos que no alcanzan la nota de aprobación.
- La solapa Febrero muestra solo alumnos que no aprobaron en diciembre.
- Se agrega exportación compatible con Excel (`.xls`) desde el navegador.

## Importante

Este bloque reutiliza las tablas del Bloque 25:

- `evaluaciones`
- `calificaciones`

No requiere ejecutar SQL nuevo si ya se ejecutó `ada_bloque_25_calificaciones_boletines.sql`.

## Recomendación operativa

1. Seleccionar curso.
2. Seleccionar materia.
3. Cargar alumnos y notas.
4. Completar la grilla anual.
5. Guardar planilla.
6. Actualizar cierre anual.
7. Cargar Diciembre si corresponde.
8. Cargar Febrero si corresponde.
9. Exportar a Excel para resguardo o impresión.
