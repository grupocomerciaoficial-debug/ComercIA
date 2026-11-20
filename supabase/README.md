# Supabase de ComercIA

Este directorio conserva las migraciones versionadas, el esquema remoto de referencia y los recursos necesarios para desarrollo local.

## Fuente de verdad del esquema

- `migrations/`: cambios incrementales y ordenados por fecha. No borres ni renombres una migración que ya haya sido aplicada en remoto; Supabase usa su versión para llevar el historial.
- `schema_remoto.sql`: fotografía del esquema `public` exportada desde el proyecto remoto. No contiene los datos de las tablas y no reemplaza las migraciones.

Para actualizar la fotografía desde la raíz del repositorio:

```powershell
npx supabase db dump --remote --schema public --file supabase/schema_remoto.sql
```

Revisa la línea `Target:` para confirmar que el destino sea ComercIA. El comando consulta la base remota y escribe o reemplaza `schema_remoto.sql`; no modifica la base.

## Migraciones actuales

Las migraciones se aplican en orden:

1. `20261111000000_esquema_actual.sql`: esquema base y funciones.
2. `20261118000000_pruebas_pedidos.sql`: ajustes del panel, pedidos y reactivación.
3. `20261118190000_proteger_atenciones_sin_autorizacion.sql`: conserva las alertas de privacidad durante la pausa.
4. `20261118200000_no_duplicar_mensajes_pausados.sql`: evita registrar dos veces mensajes entrantes.
5. `20261118210000_cerrar_alerta_privacidad_al_aceptar.sql`: cierra la alerta previa y reactiva la conversación cuando el cliente acepta.

Para revisar lo que falta aplicar antes de actualizar remoto:

```powershell
npx supabase db push --remote --dry-run
```

Aplica migraciones solo después de confirmar el destino y la lista propuesta:

```powershell
npx supabase db push --remote
```

## Desarrollo local

- `config.toml`: configuración del CLI para el entorno local.
- `seed.sql`: datos sintéticos para cargar el entorno local después de un reset.
- `tests/`: documentación de pruebas SQL.

Para recrear la base local, ejecuta `npx supabase db reset` desde la raíz. Ese comando borra y vuelve a crear la base local; no lo uses contra remoto.

La web local usa la URL y la clave pública que muestra `npx supabase status`. Nunca incluyas claves `service_role`, tokens de n8n, credenciales ni contraseñas en el navegador o en Git.

## Archivos locales excluidos de Git

Las carpetas `.temp/`, `.branches/` y `backups/`, así como `seed.berakah.local.sql`, son estado o respaldos locales y están ignorados por Git. `backups/` se conserva como recuperación local; no la agregues al repositorio.

No guardes aquí exportaciones de datos de remoto ni listas de usuarios. Para compartir o versionar el esquema, usa únicamente las migraciones y `schema_remoto.sql`.
