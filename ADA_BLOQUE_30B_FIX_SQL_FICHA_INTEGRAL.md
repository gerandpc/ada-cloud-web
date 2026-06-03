# ADA Cloud Web - Bloque 30B
## Fix SQL Ficha integral del alumno

Corrige el error:

`column "created_at" does not exist`

La vista `v_ficha_documentacion_alumno` ahora detecta automáticamente qué columna de fecha existe en `documentacion_destinatarios`:

- `created_at`
- `fecha_envio`
- `fecha_creacion`
- `enviado_en`
- `createdat`

Si no encuentra ninguna, crea la vista igual con `ultimo_movimiento` en `NULL`.

Ejecutar en Supabase:

`docs/sql/ada_bloque_30b_fix_ficha_integral.sql`
