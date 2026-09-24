-- ═══════════════════════════════════════════════════════════════════════════
-- 014_catalogo_generico.sql
-- Refactor: catálogo genérico — de "cases" a productos de cualquier categoría.
--
-- Cambios principales:
--   • catalogo_cases        → catalogo_productos
--   • case_id               → producto_id  (PK y FKs en tablas hijas)
--   • tipo_case             → serie        (línea de producto; nullable)
--   • Nuevo: categoria      — agrupación de alto nivel (FUNDA, ACCESORIO, …)
--   • Nuevo: nombre         — nombre de display del producto (requerido)
--   • Nuevo: atributos      — JSONB para atributos libres (accesorios, etc.)
--   • modelo y color pasan a ser nullable (accesorios no los requieren)
--   • pedido_items:
--       tipo_case → serie, agrega producto_id FK, categoria, atributos
--
-- Idempotente: seguro de re-ejecutar (usa IF EXISTS / IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 1 — Drop FKs de tablas hijas (se recrean en PASO 10)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.movimientos_stock
  DROP CONSTRAINT IF EXISTS movimientos_stock_case_id_fkey;

ALTER TABLE public.reservas
  DROP CONSTRAINT IF EXISTS reservas_case_id_fkey;

ALTER TABLE public.stock_reservas
  DROP CONSTRAINT IF EXISTS stock_reservas_case_id_fkey;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 2 — Renombrar tabla catalogo_cases → catalogo_productos
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'catalogo_cases'
  ) THEN
    ALTER TABLE public.catalogo_cases RENAME TO catalogo_productos;
    RAISE NOTICE '[014] catalogo_cases renombrada a catalogo_productos';
  ELSE
    RAISE NOTICE '[014] catalogo_productos ya existe, se omite rename de tabla';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 3 — Renombrar PK: case_id → producto_id
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_productos'
      AND column_name = 'case_id'
  ) THEN
    ALTER TABLE public.catalogo_productos RENAME COLUMN case_id TO producto_id;
    RAISE NOTICE '[014] case_id renombrado a producto_id';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 4 — Drop UNIQUE constraint antiguo (tipo_case, modelo, color)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.catalogo_productos
  DROP CONSTRAINT IF EXISTS catalogo_cases_tipo_case_modelo_color_key;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 5 — Renombrar tipo_case → serie (nullable para accesorios)
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_productos'
      AND column_name = 'tipo_case'
  ) THEN
    ALTER TABLE public.catalogo_productos RENAME COLUMN tipo_case TO serie;
    RAISE NOTICE '[014] tipo_case renombrado a serie';
  END IF;
END $$;

-- Quitar NOT NULL de serie (los accesorios no tienen serie/línea)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_productos'
      AND column_name = 'serie' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.catalogo_productos ALTER COLUMN serie DROP NOT NULL;
    RAISE NOTICE '[014] serie ahora es nullable';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 6 — Agregar columnas nuevas
-- ───────────────────────────────────────────────────────────────────────────

-- categoria: agrupación de alto nivel.
--   Valores sugeridos: 'FUNDA' | 'ACCESORIO' | 'CARGADOR' | 'MICA' | …
--   Abierto — no tiene CHECK para permitir nuevas categorías sin migrar.
ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'FUNDA';

-- nombre: nombre de display del producto (requerido).
ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS nombre TEXT NOT NULL DEFAULT '';

-- atributos: pares clave-valor libres en JSONB.
--   Ej. para accesorio: {"material":"Aluminio","compatibilidad":"Universal MagSafe"}
ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS atributos JSONB;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 7 — Hacer nullable modelo y color
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_productos'
      AND column_name = 'modelo' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.catalogo_productos ALTER COLUMN modelo DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalogo_productos'
      AND column_name = 'color' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.catalogo_productos ALTER COLUMN color DROP NOT NULL;
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 8 — Poblar `nombre` para filas existentes (fundas actuales)
-- ───────────────────────────────────────────────────────────────────────────
UPDATE public.catalogo_productos
SET nombre = TRIM(CONCAT_WS(' ',
  NULLIF(serie,  ''),
  NULLIF(modelo, ''),
  CASE WHEN color IS NOT NULL AND color NOT IN ('NEGRO', '')
       THEN '— ' || color
       ELSE NULL
  END
))
WHERE nombre = '' OR nombre IS NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 9 — Renombrar case_id → producto_id en tablas hijas
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'movimientos_stock'
      AND column_name = 'case_id'
  ) THEN
    ALTER TABLE public.movimientos_stock RENAME COLUMN case_id TO producto_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservas'
      AND column_name = 'case_id'
  ) THEN
    ALTER TABLE public.reservas RENAME COLUMN case_id TO producto_id;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_reservas'
      AND column_name = 'case_id'
  ) THEN
    ALTER TABLE public.stock_reservas RENAME COLUMN case_id TO producto_id;
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 10 — Recrear FKs con nombres nuevos
-- ───────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'movimientos_stock_producto_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.movimientos_stock
      ADD CONSTRAINT movimientos_stock_producto_id_fkey
      FOREIGN KEY (producto_id)
      REFERENCES public.catalogo_productos(producto_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reservas_producto_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.reservas
      ADD CONSTRAINT reservas_producto_id_fkey
      FOREIGN KEY (producto_id)
      REFERENCES public.catalogo_productos(producto_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_reservas_producto_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.stock_reservas
      ADD CONSTRAINT stock_reservas_producto_id_fkey
      FOREIGN KEY (producto_id)
      REFERENCES public.catalogo_productos(producto_id);
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 11 — Actualizar pedido_items
-- ───────────────────────────────────────────────────────────────────────────

-- Renombrar tipo_case → serie (consistencia con catalogo_productos)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pedido_items'
      AND column_name = 'tipo_case'
  ) THEN
    ALTER TABLE public.pedido_items RENAME COLUMN tipo_case TO serie;
    RAISE NOTICE '[014] pedido_items.tipo_case renombrado a serie';
  END IF;
END $$;

-- producto_id: FK al catálogo (NULL para pedidos históricos sin producto)
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS producto_id UUID
    REFERENCES public.catalogo_productos(producto_id) ON DELETE SET NULL;

-- categoria: snapshot de la categoría en el momento de compra
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS categoria TEXT;

-- atributos: snapshot de atributos del producto en el momento de compra
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS atributos JSONB;

-- nombre_producto: snapshot del nombre del producto en el momento de compra
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS nombre_producto TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 12 — Actualizar índices
-- ───────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS idx_catalogo_tipo;
DROP INDEX IF EXISTS idx_catalogo_modelo;
DROP INDEX IF EXISTS idx_catalogo_activo;

CREATE INDEX IF NOT EXISTS catalogo_productos_categoria_idx
  ON public.catalogo_productos(categoria);

CREATE INDEX IF NOT EXISTS catalogo_productos_serie_idx
  ON public.catalogo_productos(serie)
  WHERE serie IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalogo_productos_modelo_idx
  ON public.catalogo_productos(modelo)
  WHERE modelo IS NOT NULL;

CREATE INDEX IF NOT EXISTS catalogo_productos_activo_idx
  ON public.catalogo_productos(activo);

-- Full-text search sobre nombre del producto
CREATE INDEX IF NOT EXISTS catalogo_productos_nombre_fts_idx
  ON public.catalogo_productos
  USING GIN (to_tsvector('spanish', nombre));

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 13 — Nuevo UNIQUE partial para fundas
--           (serie + modelo + color, solo cuando los tres existen)
-- ───────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS catalogo_productos_funda_uniq
  ON public.catalogo_productos(categoria, serie, modelo, color)
  WHERE serie IS NOT NULL AND modelo IS NOT NULL AND color IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 14 — Actualizar trigger de actualizado_en
-- ───────────────────────────────────────────────────────────────────────────
-- El trigger antiguo (trg_catalogo_updated) siguió a la tabla al renombrarse.
-- Lo reemplazamos con nombre coherente.
DROP TRIGGER IF EXISTS trg_catalogo_updated         ON public.catalogo_productos;
DROP TRIGGER IF EXISTS trg_catalogo_productos_updated ON public.catalogo_productos;

CREATE OR REPLACE TRIGGER trg_catalogo_productos_updated
  BEFORE UPDATE ON public.catalogo_productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 15 — Actualizar vista v_pedidos_resumen
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_pedidos_resumen AS
SELECT
  p.id,
  p.telefono,
  c.nombre          AS cliente_nombre,
  p.tipo_case,                        -- campo heredado del flujo n8n
  p.estado,
  p.origen,
  p.requiere_firma,
  p.resumen,
  COUNT(pi.id)      AS total_modelos,
  SUM(pi.cantidad)  AS total_piezas,
  p.creado_en,
  p.actualizado_en
FROM public.pedidos p
LEFT JOIN public.clientes c  ON c.telefono  = p.telefono
LEFT JOIN public.pedido_items pi ON pi.pedido_id = p.id
GROUP BY p.id, c.nombre;

COMMIT;
