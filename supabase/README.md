# Supabase local

El proyecto usa migraciones versionadas en `migrations/`, datos locales en `seed.sql` y pruebas SQL en `tests/`.

Para una instancia local descartable, inicia Docker y Supabase desde la raíz del repositorio. `npx supabase db reset` elimina y recrea la base local, aplica las migraciones y vuelve a cargar la semilla; confirma antes que no necesitas conservar datos locales.

Configura la web con `VITE_SUPABASE_URL` y la clave pública que informa `npx supabase status`. Nunca uses la clave `service_role` en el navegador.

La migración de extensiones restringe permisos de `anon` y `authenticated`. Antes de aplicarla a una base compartida, Camilo y Sneider deben validar cómo se autentican los flujos n8n. La lectura del detalle de alertas está condicionada por la UI, pero RLS no oculta una columna dentro de una fila visible. Si el equipo exige protección directa por API, Camilo debe aprobar una RPC o vista sin alterar el contrato en silencio.

Los datos de `seed.sql` y credenciales asociadas son únicamente para desarrollo local; no deben emplearse en producción.

La semilla incluye el catálogo y la información comercial acordada para Berakah, junto con datos sintéticos para probar el panel. Los datos de contacto y transferencia se guardan, si hacen falta, en `seed.berakah.local.sql`, un archivo local ignorado por Git. Después de `npx supabase db reset`, ejecuta su contenido en el SQL Editor de Supabase Studio local. No incluyas ese archivo en un commit.

