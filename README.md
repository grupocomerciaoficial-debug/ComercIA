# ComercIA

ComercIA es un asistente de ventas por mensajería con un panel web para administrar pedidos, catálogo y atención del comercio. El MVP usa Telegram; WhatsApp/Meta queda como canal futuro.

## Componentes

- `web/`: panel React/Vite conectado directamente a Supabase. El envío de mensajes desde la bandeja usa un endpoint de n8n.
- `supabase/`: configuración local, migraciones, semillas y pruebas SQL.
- `n8n/`: flujos, prompts y configuración operativa del bot. Nunca versionar credenciales.
- `qa/`: guía de aseguramiento de calidad e informes de pruebas.
- `docs/`: documentación aprobada del equipo y entregables finales.

## Requisitos y arranque local

- Node.js 22.x (22.13 o superior recomendado).
- Docker Desktop iniciado para Supabase local.
- Supabase CLI ejecutado con `npx`.

Levanta Supabase local y revisa los valores que necesitará el panel:

```powershell
npx supabase start
npx supabase status
```

Crea `web/.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, usando la URL y la clave pública que muestra el CLI. Si vas a habilitar respuestas desde la bandeja, agrega también `VITE_N8N_PANEL_ENVIAR_URL`. Nunca uses `service_role` en el navegador. Instala y levanta el panel:

```powershell
Set-Location web
npm ci
npm run dev
```

La guía de [configuración del panel](web/README.md) detalla las variables de entorno y los comandos disponibles.

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
