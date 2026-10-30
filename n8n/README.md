# Automatizaciones n8n

Esta carpeta contiene los flujos versionados de n8n y los prompts aprobados. El canal del MVP es Telegram; los contratos futuros de WhatsApp/Meta están documentados en `../docs/canal/whatsapp-futuro.md`.

## Estructura

- `workflows/`: exportaciones JSON de WF-01 a WF-12, sin credenciales incrustadas.
- `prompts/`: prompts de IA versionados, con límites y ejemplos de prueba.

## Credenciales

Recrea las credenciales directamente en la instancia n8n. Guarda solo los nombres y tipos necesarios en la documentación; nunca exportes tokens, claves, secretos ni datos de conexión privados.

## Integración

n8n comparte los datos operativos mediante Supabase: comercio, catálogo, guía, conversaciones y pedidos. El endpoint de respuesta manual del panel debe validar el JWT y la autorización por comercio. Los contratos pendientes están en `../docs/arquitectura/contratos.md` y `../docs/arquitectura/checklist-integracion.md`.
