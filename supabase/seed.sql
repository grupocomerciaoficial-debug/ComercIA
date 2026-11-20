-- Datos ficticios exclusivamente para Supabase local.
-- No incluir información de clientes, comercios ni credenciales reales.

insert into public.comercios
  (nombre, direccion, entregas, modo_seguimiento, tiempo_preparacion,
   tiempo_respuesta, canal, horario_atencion)
values
  ('Comercio de pruebas ComercIA', 'Dirección ficticia de pruebas',
   array['domicilio', 'recogida'], 'completo', '30-45 minutos',
   'unos minutos', 'telegram',
   '{"lunes":{"abre":"09:00","cierra":"18:00"},"martes":{"abre":"09:00","cierra":"18:00"}}'::jsonb);

insert into public.productos
  (id_comercio, nombre, descripcion, precio, stock, disponible, categoria)
select c.id_comercio, x.nombre, x.descripcion, x.precio, x.stock, x.disponible, x.categoria
from public.comercios c
cross join (values
  ('Rosa de prueba', 'Producto ficticio para validar pedidos.', 20000::numeric, 20, true, 'Flores'),
  ('Girasol de prueba', 'Producto ficticio para validar pedidos.', 15000::numeric, 12, true, 'Flores'),
  ('Caja de prueba', 'Producto ficticio para validar pedidos.', 10000::numeric, 0, false, 'Detalles')
) as x(nombre, descripcion, precio, stock, disponible, categoria)
where c.nombre = 'Comercio de pruebas ComercIA';

insert into public.clientes (id_comercio, nombre, telefono_whatsapp)
select c.id_comercio, x.nombre, x.telefono
from public.comercios c
cross join (values
  ('Cliente Prueba Uno', 'test-telegram-001'),
  ('Cliente Prueba Dos', 'test-telegram-002')
) as x(nombre, telefono)
where c.nombre = 'Comercio de pruebas ComercIA';

insert into public.conversaciones
  (id_comercio, id_cliente, identificador_whatsapp, estado_bot, pausada)
select c.id_comercio, c.id_cliente, c.telefono_whatsapp, 'MENU', false
from public.clientes c
join public.comercios co on co.id_comercio = c.id_comercio
where co.nombre = 'Comercio de pruebas ComercIA';

insert into public.pedidos
  (id_comercio, id_cliente, id_conversacion, fecha_pedido, direccion_entrega,
   tipo_entrega, metodo_pago, estado, total, cliente_wa_id)
select c.id_comercio, c.id_cliente, v.id_conversacion, now() - interval '1 hour',
       'Dirección ficticia de prueba', 'domicilio', 'efectivo', 'pendiente',
       0, c.telefono_whatsapp
from public.clientes c
join public.conversaciones v
  on v.id_comercio = c.id_comercio
 and v.id_cliente = c.id_cliente
where c.telefono_whatsapp = 'test-telegram-001'
  and exists (select 1 from public.comercios co where co.id_comercio = c.id_comercio and co.nombre = 'Comercio de pruebas ComercIA');

-- Este pedido arranca deliberadamente en cero. El trigger de la migración
-- debe corregir el total al insertar los renglones (2 x 20.000 + 1 x 15.000).
insert into public.detalle_pedido
  (id_pedido, id_producto, cantidad, precio_unitario, subtotal, nombre_producto)
select p.id_pedido, pr.id_producto, x.cantidad, pr.precio,
       pr.precio * x.cantidad, pr.nombre
from public.pedidos p
join (values ('Rosa de prueba', 2), ('Girasol de prueba', 1))
  as x(nombre, cantidad) on true
join public.productos pr
  on pr.id_comercio = p.id_comercio and pr.nombre = x.nombre
where p.cliente_wa_id = 'test-telegram-001';

insert into public.pedidos
  (id_comercio, id_cliente, id_conversacion, fecha_pedido, direccion_entrega,
   tipo_entrega, metodo_pago, estado, total, cliente_wa_id)
select c.id_comercio, c.id_cliente, v.id_conversacion, now() - interval '20 minutes',
       'Recogida en tienda', 'recogida', 'transferencia', 'pendiente',
       40000, c.telefono_whatsapp
from public.clientes c
join public.conversaciones v
  on v.id_comercio = c.id_comercio
 and v.id_cliente = c.id_cliente
where c.telefono_whatsapp = 'test-telegram-002'
  and exists (select 1 from public.comercios co where co.id_comercio = c.id_comercio and co.nombre = 'Comercio de pruebas ComercIA');

insert into public.detalle_pedido
  (id_pedido, id_producto, cantidad, precio_unitario, subtotal, nombre_producto)
select p.id_pedido, pr.id_producto, 2, pr.precio, pr.precio * 2, pr.nombre
from public.pedidos p
join public.productos pr
  on pr.id_comercio = p.id_comercio and pr.nombre = 'Rosa de prueba'
where p.cliente_wa_id = 'test-telegram-002';

