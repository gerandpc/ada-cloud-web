# ADA Test Center

Módulo de control automático disponible para Administración y Dirección en `pages/qa-academica.html`.

## Alcance

Ejecuta pruebas de solo lectura sobre:

- sesión, perfil y conexión con Supabase;
- tablas y columnas mínimas;
- permisos declarados y coherencia entre roles;
- páginas, controles y acciones JavaScript;
- recursos y enlaces internos;
- sintaxis y textos internos visibles;
- exportaciones contextuales;
- evidencia de estados y relaciones en flujos académicos;
- accesibilidad y responsive básico.

## Límites deliberados

El navegador no suplanta cuentas de otros roles ni inserta datos de prueba en producción. Por ese motivo, un circuito entre Docente, Directivo, Alumno y Familia se certifica automáticamente hasta el nivel de estructura, permisos y evidencia existente. Las transiciones reales que no tengan registros se informan como advertencia, no como aprobación ficticia.

## Informes

El resultado puede descargarse como JSON o CSV, imprimirse y queda guardado localmente en un historial de hasta diez ejecuciones.
