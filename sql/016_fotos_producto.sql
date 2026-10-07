-- ═══════════════════════════════════════════════════════════════════════════
-- 016_fotos_producto.sql
-- Agrega columna fotos TEXT[] para galería de imágenes por producto.
-- foto_url sigue siendo la imagen principal/thumbnail (catálogo).
-- fotos[] almacena imágenes adicionales del carrusel en detalle de producto.
--
-- Idempotente: seguro de re-ejecutar.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS fotos TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
