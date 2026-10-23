-- 017 — pedido_items.serie debe admitir NULL (accesorios/cargadores no tienen serie).
-- La migración 014 solo lo hizo en catalogo_productos. Idempotente.
-- Mientras no se aplique, el código guarda '' en lugar de NULL (ver api/client/orders).
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pedido_items'
      AND column_name = 'serie' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.pedido_items ALTER COLUMN serie DROP NOT NULL;
    RAISE NOTICE '[017] pedido_items.serie ahora es nullable';
  END IF;
END $$;
