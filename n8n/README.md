# Automatizaciones n8n

El canal implementado en el MVP es Telegram. La integración con WhatsApp/Meta es futura y no está incluida en los flujos actuales.

## Estructura

- `workflows/V1/` y `workflows/V2/`: exportaciones de WF-01 a WF-12 y del subflujo SUB-01. Mantén cada conjunto dentro de su versión y no combines nodos de versiones distintas.
- `prompts/`: documentación técnica, diagramas y criterios de los prompts.

## Credenciales

Recrea las credenciales directamente en la instancia n8n. No exportes tokens, claves, secretos, URLs privadas ni datos reales de clientes.

## Integración con el panel

n8n comparte los datos operativos mediante Supabase: comercios, catálogo, guía, conversaciones y pedidos. El endpoint que permite responder desde la bandeja del panel debe validar el JWT de Supabase y la autorización del usuario para ese comercio.

Aplica en orden las migraciones disponibles en `../supabase/migrations` y confirma que la base incluya las funciones que usan los flujos antes de importarlos o activarlos. Consulta `../supabase/README.md` para revisar el esquema y las migraciones.
