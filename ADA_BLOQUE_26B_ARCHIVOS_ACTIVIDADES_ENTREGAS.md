# ADA Cloud Web - Bloque 26B
## Archivos adjuntos en actividades y entregas

Este ajuste completa el Bloque 26 para que el circuito de tareas sea más real:

- El docente puede crear una actividad y adjuntar una consigna en PDF, Word o imagen.
- El alumno puede entregar una respuesta escrita y adjuntar PDF, Word o imagen.
- El docente puede revisar entregas con archivo adjunto.
- Las consignas y entregas se guardan en Supabase Storage en el bucket privado `ada-actividades`.
- Los enlaces se abren con signed URLs temporales, no con archivos públicos permanentes.

## Archivos modificados

- `pages/actividades.html`
- `pages/entregas.html`
- `assets/js/actividades.js`
- `assets/js/entregas.js`
- `assets/css/bloque26-actividades-entregas.css`

## SQL necesario

Ejecutar en Supabase SQL Editor:

```sql
-- docs/sql/ada_bloque_26b_archivos_actividades_entregas.sql
```

Este SQL agrega metadatos de archivo a:

- `actividades`
- `entregas_actividades`

Y crea/configura el bucket:

- `ada-actividades`

## Formatos permitidos

- PDF
- Word `.doc`
- Word `.docx`
- JPG/JPEG
- PNG
- WEBP

Tamaño máximo configurado: 10 MB.

## Prueba sugerida

1. Entrar como docente.
2. Ir a Actividades.
3. Crear una actividad con archivo PDF o Word.
4. Entrar como alumno.
5. Ir a Entregas.
6. Abrir la actividad y subir una entrega con archivo.
7. Volver como docente.
8. Revisar la entrega y abrir el archivo adjunto.
