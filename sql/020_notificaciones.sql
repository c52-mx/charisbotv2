-- 020 — Notificaciones internas (campanita del admin). Idempotente.
-- Cada notificación se dirige a un PERMISO: la ve cualquier usuario interno cuyo rol lo tenga (ADMIN las ve todas).
-- El estado leído es por usuario.
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permiso   TEXT NOT NULL,
  tipo      TEXT NOT NULL,
  titulo    TEXT NOT NULL,
  mensaje   TEXT,
  pedido_id UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_creado ON public.notificaciones (creado_en DESC);

CREATE TABLE IF NOT EXISTS public.notificaciones_leidas (
  usuario_id      UUID NOT NULL,
  notificacion_id UUID NOT NULL REFERENCES public.notificaciones(id) ON DELETE CASCADE,
  leida_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, notificacion_id)
);
