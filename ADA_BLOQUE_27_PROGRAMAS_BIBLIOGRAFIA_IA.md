# ADA Bloque 27 — Programas, bibliografía y base curricular para IA

Este bloque recupera del ADA viejo la lógica de **programas de materia** y **versionado/recursos**, pero lo adapta al ADA nuevo con Supabase, Storage privado y estética del Bloque 24.

## Qué agrega

- Nueva página: `pages/programas.html`.
- Nuevo módulo en el menú lateral: **Programas y bibliografía**.
- Carga de programa por curso, materia, año lectivo y versión.
- Archivo adjunto del programa: PDF, Word o imagen.
- Carga de bibliografía y recursos asociados al programa.
- Archivo o link externo para cada recurso.
- Estado del programa: borrador, pendiente, aprobado u observado.
- Directivos/admin pueden aprobar u observar programas.
- Marca `habilitado_ia` para preparar el uso futuro de ADA IA con fuentes curriculares validadas.

## Por qué va antes de justificaciones

Antes de avanzar con IA real, ADA necesita una base curricular confiable. La IA no debería responder desde internet o desde documentos sueltos, sino desde:

1. programas aprobados;
2. bibliografía sugerida/obligatoria;
3. materiales validados por docentes o directivos;
4. documentos habilitados por rol, curso y materia.

## SQL necesario

Ejecutar en Supabase:

```sql
-- docs/sql/ada_bloque_27_programas_bibliografia_ia.sql
```

Crea:

- `programas_materia`
- `programa_recursos`
- bucket privado `ada-programas`
- políticas RLS básicas
- vista `v_fuentes_ia_curriculares`

## Permisos funcionales

- Admin/directivo: ven, cargan, aprueban y observan.
- Docente: carga programas y recursos.
- Secretaría/preceptoría/familia/alumno: consulta lo cargado.

## Próximo paso

Luego de este bloque, el siguiente queda como:

**Bloque 28 — Justificaciones, tardanzas y retiros**.
