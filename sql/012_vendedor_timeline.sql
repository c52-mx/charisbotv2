-- 012_vendedor_timeline.sql
-- Extiende pedido_timeline para soportar múltiples tipos de eventos
-- (cambio de vendedor, notas internas, cambio de sede pickup, etc.)
-- Idempotente: seguro de re-ejecutar.

-- tipo_evento discrimina el tipo de entrada:
--   'ESTADO'   — cambio de estado (valor existente, DEFAULT para filas históricas)
--   'VENDEDOR' — reasignación de vendedor
--   'NOTA'     — observación/nota interna agregada por un usuario
--   'PICKUP'   — cambio de sede de recolección
ALTER TABLE public.pedido_timeline
  ADD COLUMN IF NOT EXISTS tipo_evento TEXT NOT NULL DEFAULT 'ESTADO';

-- detalle almacena datos estructurados específicos del evento:
--   VENDEDOR: { vendedor_anterior_id, vendedor_anterior_nombre, vendedor_nuevo_id, vendedor_nuevo_nombre }
--   PICKUP:   { pickup_anterior, pickup_nuevo }
--   NOTA:     null (la nota va en la columna `nota`)
--   ESTADO:   null
ALTER TABLE public.pedido_timeline
  ADD COLUMN IF NOT EXISTS detalle JSONB;

-- Índice para consultas de eventos por tipo (ej. último vendedor asignado)
CREATE INDEX IF NOT EXISTS pedido_timeline_tipo_evt_idx
  ON public.pedido_timeline (pedido_id, tipo_evento, creado_en DESC);