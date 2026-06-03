# ADA Cloud Web — Bloque 28
## Documentación familiar, justificaciones y firmas

Este bloque incorpora un módulo unificado para gestionar documentación entre escuela y familias, diferenciando circuitos de Secretaría y Preceptoría.

## Archivos incluidos

- `pages/documentacion.html`
- `assets/js/documentacion.js`
- `assets/css/bloque28-documentacion.css`
- `assets/js/ada-security.js`
- `docs/sql/ada_bloque_28_documentacion_familiar.sql`

## Qué permite

### Secretaría
- Enviar documentos formales para firma o devolución.
- Enviar a un curso, varios cursos, alumnos seleccionados o un alumno.
- Revisar devoluciones familiares.
- Aprobar, observar o rechazar documentación recibida.

### Preceptoría
- Gestionar justificaciones, certificados, tardanzas y retiros.
- Enviar solicitudes a familias de manera masiva o selectiva.
- Revisar comprobantes familiares.

### Familia / Alumno
- Ver documentos pendientes.
- Descargar PDF/Word/imagen enviados por Secretaría o Preceptoría.
- Subir devolución firmada.
- Subir certificados o comprobantes propios.
- Consultar estado: pendiente, visto, devuelto, aprobado, observado o rechazado.

### Directivo / Admin
- Supervisar todos los circuitos.
- Ver documentación por origen, alumno, curso y estado.

## Diseño de datos

El bloque separa tres niveles para evitar duplicar archivos:

1. `documentacion_tramites`: trámite principal o documento enviado.
2. `documentacion_destinatarios`: destinatarios individuales por alumno/familia.
3. `documentacion_devoluciones`: archivos recibidos de cada familia/alumno.
4. `documentacion_auditoria`: trazabilidad del circuito.

Ejemplo:

- Secretaría sube una autorización para todo 3°A.
- El archivo original se guarda una sola vez.
- ADA crea un destinatario por cada alumno/familia.
- Cada familia devuelve su propio archivo firmado.

## Storage

Crea el bucket privado:

`ada-documentacion-familiar`

Organización sugerida:

```text
enviados/secretaria/2026/tramite_id/documento.pdf
enviados/preceptoria/2026/tramite_id/documento.pdf
recibidos/2026/tramite_id/alumno_id/devolucion.pdf
```

## Antes de probar

Ejecutar en Supabase:

`docs/sql/ada_bloque_28_documentacion_familiar.sql`

## Próximo bloque recomendado

Bloque 29 — Convivencia, sanciones y descréditos.

Ese bloque debería usar este motor para notificar a la familia y registrar firma/acuse, pero manteniendo sanciones como módulo propio para no mezclarlo con certificados o documentación administrativa.
