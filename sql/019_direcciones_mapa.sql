-- 019 — Punto exacto (OpenStreetMap) en las direcciones del cliente. Idempotente.
-- Mientras no se aplique, guardar una dirección con pin falla; sin pin el INSERT también
-- referencia las columnas, así que aplicar ANTES de desplegar.
ALTER TABLE public.direcciones_cliente ADD COLUMN IF NOT EXISTS lat NUMERIC(9,6);
ALTER TABLE public.direcciones_cliente ADD COLUMN IF NOT EXISTS lng NUMERIC(9,6);
