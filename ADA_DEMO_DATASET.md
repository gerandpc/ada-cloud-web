# ADA Demo Dataset

Módulo controlado para generar y eliminar registros académicos de prueba.

## Instalación
1. Subir los archivos del paquete respetando las rutas.
2. Ejecutar `supabase/migrations/202608020002_ada_demo_dataset.sql` en Supabase SQL Editor.
3. Entrar como Administrador o Directivo.
4. Abrir `pages/demo-dataset.html`.
5. Generar el dataset y luego ejecutar `pages/qa-academica.html`.

## Seguridad
- Solo Administración y Dirección pueden ejecutar las funciones.
- No se crean usuarios de Authentication.
- Se utilizan perfiles, curso, materia y período activos existentes.
- Cada registro creado queda registrado en `ada_demo_records`.
- El borrado elimina exclusivamente esos identificadores.
- La función devuelve advertencias cuando una tabla no admite el payload esperado o falta un prerrequisito.
