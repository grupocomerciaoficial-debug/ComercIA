# ComercIA

ComercIA es un asistente de ventas por mensajería con un panel web para administrar pedidos, catálogo y atención del comercio. El MVP usa Telegram; WhatsApp/Meta queda como canal futuro.

## Componentes

- `web/`: panel React/Vite conectado directamente a Supabase. El envío de mensajes desde la bandeja usa un endpoint de n8n.
- `supabase/`: configuración local, migraciones, semillas y pruebas SQL.
- `n8n/`: flujos, prompts y configuración operativa del bot. Nunca versionar credenciales.
- `qa/`: casos, evaluación de IA, resultados y evidencias revisadas.
- `docs/`: documentación aprobada del equipo y entregables finales.

## Requisitos y arranque local

- Node.js 22.x (22.13 o superior recomendado).
- Docker Desktop iniciado para Supabase local.
- Supabase CLI ejecutado con `npx`.

Después de integrar la configuración y las migraciones de Supabase, levanta la base local y revisa sus valores:

```powershell
npx supabase start
npx supabase status
```

Copia la URL local y la clave pública a `web/.env.local` usando los nombres de `web/.env.example`. Nunca uses `service_role` en el navegador. Después de integrar el paquete de la web, instala y levántala:

```powershell
Set-Location web
npm ci
npm run dev
```

La base local se reconstruye con `npx supabase db reset`; el comando elimina los datos de esa instancia local y vuelve a cargar migraciones y semilla. No lo ejecutes si necesitas conservar información local.

## Equipo

| Persona | Área |
| --- | --- |
| Camilo Carrillo | Supabase, esquema y seguridad |
| Sneider Jurgensen | n8n, canal, conversación e IA |
| Sofi Galvis | Acceso, configuración y Product Owner |
| Fabian Jaimes | Pedidos y bandeja web |
| Cristian Castro | QA y documentación final |

## Contribuciones

Trabajamos en ramas `codex/` o ramas por funcionalidad y abrimos pull requests hacia `main`. Cada PR debe indicar alcance, comprobaciones realizadas, cambios de base o contratos y pendientes. Los identificadores reales de GitHub deben agregarse a `.github/CODEOWNERS` antes de exigir revisiones automáticas por responsable.

Consulta [la guía de documentación](docs/README.md), [Supabase](supabase/README.md) y [la web](web/README.md) para los detalles por componente.
