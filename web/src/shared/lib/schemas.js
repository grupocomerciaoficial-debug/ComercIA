import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Escribe un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

export const productSchema = z.object({
  nombre: z.string().trim().min(2, 'Escribe el nombre del producto.').max(100),
  descripcion: z.string().trim().max(500).default(''),
  precio: z.coerce
    .number()
    .int('Usa un valor en pesos sin decimales.')
    .positive('El precio debe ser mayor que cero.'),
  categoria: z.string().trim().min(1, 'Escribe una categoría.').max(50),
  disponibilidad: z.enum(['disponible', 'agotado']),
});

export const businessSchema = z.object({
  nombre_comercial: z.string().trim().min(2, 'Escribe el nombre del negocio.').max(120),
  direccion: z.string().trim().max(200).default(''),
  datos_transferencia: z.string().trim().max(500).default(''),
  telefono_alertas: z.string().trim().max(24).default(''),
  tiempo_respuesta_humana: z.string().trim().max(100).default(''),
  tiempo_estimado: z.string().trim().max(100).default(''),
  modo_seguimiento: z.enum(['basico', 'completo']),
  entregas: z.object({ domicilio: z.boolean(), recogida: z.boolean() }),
  horario: z.record(
    z.string(),
    z.object({ activo: z.boolean(), abre: z.string(), cierra: z.string() }),
  ),
});
