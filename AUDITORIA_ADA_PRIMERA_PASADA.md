# Auditoría ADA — primera pasada técnica

## Corregido en este paquete

- Se eliminaron etiquetas visibles de desarrollo del tipo **“Bloque XX”**.
- Se quitaron avisos internos sobre funciones que se harían “en un próximo bloque”.
- Se corrigieron tres referencias CSS rotas.
- Se incorporó exportación contextual a PDF para listados de usuarios, alumnos, docentes, directivos, preceptoría, familias, cursos, materias, asistencia, calificaciones, reportes y boletines.
- Se incorporó exportación individual del contenido estructurado de cada programa.
- La exportación genera un documento separado; no imprime la pantalla, los menús ni los formularios.

## Hallazgos pendientes que requieren una siguiente corrección

1. **RLS de Supabase no auditable desde este ZIP.** El frontend limita páginas y menús, pero para certificar privacidad falta revisar las políticas SQL reales.
2. **Ficha de alumno:** el mapa de frontend permite acceso a alumno y familia. Debe verificarse que la consulta solo devuelva el alumno autenticado o los hijos vinculados.
3. **Documentos y comunicados:** deben validarse las políticas por destinatario, curso e institución.
4. **Consultas amplias:** varios módulos usan vistas o tablas sin filtro explícito en JavaScript y dependen de RLS.
5. **Exportaciones restantes:** falta documento individual para actividad, entrega corregida, boletín individual, acta de calificaciones y ficha integral.
6. **Textos institucionales:** quedan mensajes pedagógicos válidos, pero se eliminaron los textos internos de desarrollo detectados.

## Próximo bloque recomendado

Cerrar documentos individuales: actividad, entrega, boletín, acta, asistencia y ficha integral; luego ejecutar prueba de acceso URL por cada rol.
