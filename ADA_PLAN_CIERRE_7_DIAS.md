# ADA — Plan de cierre intensivo

## Bloque 1 aplicado: seguridad y permisos

- Se declararon explícitamente todas las páginas pedagógicas faltantes.
- Se cambió la política del frontend a **denegar por defecto** toda página no registrada.
- Se unificó la visibilidad de menú con los permisos reales por página.
- Se quitaron del rol docente y preceptor módulos administrativos que figuraban en el menú pero estaban bloqueados.
- Se incorporaron Programas, Actividades, Entregas, Boletines y Documentación a los roles correctos.
- Se eliminó el fallback peligroso de Calificaciones que mostraba todos los alumnos cuando un curso no tenía coincidencias.

## Próximos bloques

1. Auditoría RLS y políticas Supabase.
2. Aislamiento de datos por institución, curso, materia y usuario.
3. Flujo completo Programas.
4. Flujo Actividades → Entregas → Corrección.
5. Calificaciones → Cierre → Boletines.
6. Portales Alumno y Familia.
7. Pruebas finales por rol y acceso directo por URL.
