-- 018 — Hallazgos 3 (octubre 2026). Idempotente.
--   • Avance de surtido por artículo (cantidad_surtida / motivo_surtido).
--   • Tipo del pedido vacío en pedidos de solo accesorios creados desde el portal.
--   • Pedidos creados por clientes desde el portal marcados como origen WHATSAPP.
BEGIN;

ALTER TABLE public.pedido_items ADD COLUMN IF NOT EXISTS cantidad_surtida INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.pedido_items ADD COLUMN IF NOT EXISTS motivo_surtido   TEXT;

UPDATE public.pedidos SET tipo_case = 'ACCESORIO' WHERE COALESCE(tipo_case, '') = '';

-- Un pedido creado por un cliente desde el sitio (PENDIENTE_PAGO creado por su propia cuenta) no vino de WhatsApp.
UPDATE public.pedidos p SET origen = 'PORTAL'
  FROM public.usuarios u
 WHERE p.creado_por = u.id AND u.rol = 'CLIENTE' AND p.origen = 'WHATSAPP';

COMMIT;
