# ADA Motor PDF

Motor PDF local y autocontenido para ADA Cloud.

## Cambios principales

- Descarga archivos PDF reales mediante `Blob` y `application/pdf`.
- No abre pestañas `about:blank`.
- No utiliza `window.print()` para las exportaciones migradas.
- No depende de servicios externos ni de una API.
- Incorpora encabezado institucional, paginación, tarjetas, tablas y notas.

## Módulos integrados

- ADA Intelligence: informe ejecutivo.
- Programas y listados gestionados por `ada-export.js`.
- Planificaciones didácticas.
- Actividades.
- Entregas y correcciones.
- Reportes institucionales.
- Matriz de permisos.
- Convivencia.
- Cierres académicos y actas.
- ADA Test Center.

## Uso técnico

El motor queda disponible como `window.ADA_PDF`.

- `ADA_PDF.download(config)` genera documentos estructurados.
- `ADA_PDF.fromHTML(titulo, html, opciones)` convierte contenido HTML simple.
- `ADA_PDF.fromElements(titulo, elementos, opciones)` exporta secciones visibles.
