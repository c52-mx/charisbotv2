-- Migración 013 — Paquetería y datos de guía en pedidos
-- Idempotente: usa IF NOT EXISTS en cada ALTER

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS paqueteria           TEXT,
  ADD COLUMN IF NOT EXISTS envio_guia           TEXT,
  ADD COLUMN IF NOT EXISTS envio_costo          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS envio_rastreo_url    TEXT,
  ADD COLUMN IF NOT EXISTS envio_observaciones  TEXT,
  ADD COLUMN IF NOT EXISTS envio_archivo_url    TEXT;

CREATE INDEX IF NOT EXISTS pedidos_paqueteria_idx ON public.pedidos (paqueteria) WHERE paqueteria IS NOT NULL;
