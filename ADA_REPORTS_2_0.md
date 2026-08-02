# ADA Reports 2.0

Centro unificado de informes institucionales para ADA Cloud.

## Informes incluidos

- Informe Ejecutivo Institucional.
- Informe Pedagógico Institucional.
- Informe para Supervisión.
- Informe Docente.
- Informe de trayectoria del estudiante.
- Informe de seguimiento familiar.

## Características

- Descarga directa de PDF real, sin `about:blank` ni `window.print()`.
- Portada y metadatos institucionales.
- ADA Score con semaforización.
- Tarjetas de indicadores.
- Gráficos de barras vectoriales.
- Tablas paginadas.
- Observaciones y recomendaciones automáticas.
- Encabezado, pie y numeración de páginas.
- Respeto de los permisos y políticas RLS de Supabase.

## Acceso

`pages/centro-informes.html`

El contenido visible depende del rol autenticado:

- Administrador/Directivo: ejecutivo, pedagógico y supervisión.
- Docente: informe docente.
- Alumno: informe de trayectoria.
- Familia: informe de seguimiento familiar.

## Archivos principales

- `assets/js/ada-pdf.js`: motor PDF directo.
- `assets/js/ada-reports.js`: consultas, métricas y plantillas.
- `assets/css/ada-reports.css`: interfaz del Centro de Informes.
- `pages/centro-informes.html`: módulo de generación.
