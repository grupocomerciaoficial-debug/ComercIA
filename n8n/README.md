# Automatizaciones n8n

Esta carpeta contiene los flujos versionados del MVP. El canal implementado actualmente es Telegram; la integración con WhatsApp todavía no forma parte de estos flujos.

## Estructura

- `workflows/`: exportaciones JSON de WF-01 a WF-12 y del subflujo SUB-01.
- `prompts/`: prompts de IA aprobados para los flujos.

## Credenciales

Recrea las credenciales directamente en la instancia n8n. Guarda solo los nombres y tipos necesarios en la documentación; nunca exportes tokens, claves, secretos ni datos de conexión privados.

## Integración

n8n comparte los datos operativos mediante Supabase: comercio, catálogo, guía, conversaciones y pedidos. El endpoint que permite responder desde la bandeja del panel debe validar el JWT de Supabase y la autorización por comercio.

Aplica en orden las migraciones que existan en `../supabase/migrations` y confirma que la base incluya las funciones requeridas por los flujos antes de importarlos o activarlos. La lista vigente de migraciones y el procedimiento de revisión están en `../supabase/README.md`.
