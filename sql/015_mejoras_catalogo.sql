-- ═══════════════════════════════════════════════════════════════════════════
-- 015_mejoras_catalogo.sql
-- Mejoras al catálogo genérico:
--   • descripcion TEXT  — descripción visible al cliente
--   • precio_compra NUMERIC(10,2) — costo interno del producto
--   • v_dashboard_stats — vista recreada apuntando a catalogo_productos
--
-- Idempotente: seguro de re-ejecutar.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 1 — Agregar columna descripcion
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 2 — Agregar columna precio_compra (costo interno)
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE public.catalogo_productos
  ADD COLUMN IF NOT EXISTS precio_compra NUMERIC(10,2);

-- ───────────────────────────────────────────────────────────────────────────
-- PASO 3 — Recrear v_dashboard_stats apuntando a catalogo_productos
--          La vista original referenciaba catalogo_cases (tabla renombrada
--          en migración 014). Se recrea aquí de forma idempotente.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_dashboard_stats AS
SELECT
  (SELECT COUNT(*)::int
     FROM public.pedidos)                                                 AS total_pedidos,

  (SELECT COUNT(*)::int
     FROM public.pedidos
    WHERE DATE(creado_en AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE)
                                                                          AS pedidos_hoy,

  (SELECT COUNT(*)::int
     FROM public.pedidos
    WHERE creado_en >= NOW() - INTERVAL '7 days')                         AS pedidos_semana,

  (SELECT COALESCE(SUM(monto_total), 0)::numeric
     FROM public.pedidos
    WHERE DATE(creado_en AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE)
                                                                          AS ventas_hoy,

  (SELECT COALESCE(SUM(monto_total), 0)::numeric
     FROM public.pedidos
    WHERE creado_en >= NOW() - INTERVAL '7 days')                         AS ventas_semana,

  (SELECT COALESCE(SUM(monto_total), 0)::numeric
     FROM public.pedidos
    WHERE DATE_TRUNC('month', creado_en) = DATE_TRUNC('month', NOW()))    AS ventas_mes,

  (SELECT COUNT(*)::int FROM public.clientes)                             AS total_clientes,

  (SELECT COUNT(*)::int
     FROM public.catalogo_productos
    WHERE activo = true)                                                   AS productos_activos,

  (SELECT COUNT(*)::int
     FROM public.catalogo_productos
    WHERE activo = true AND stock <= 0)                                    AS productos_sin_stock,

  (SELECT COUNT(*)::int
     FROM public.catalogo_productos
    WHERE activo = true
      AND stock <= COALESCE(
        (SELECT valor::int FROM public.config_portal WHERE clave = 'stock_bajo_umbral'), 10
      ))                                                                   AS productos_stock_bajo,

  (SELECT COUNT(*)::int
     FROM public.pedidos
    WHERE estado NOT IN ('ENTREGADO', 'CANCELADO'))                        AS pedidos_activos;

COMMIT;
