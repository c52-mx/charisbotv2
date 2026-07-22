-- 011_audit.sql — Trazabilidad: creado_por, sesiones, bitácoras de clientes, catálogo y acciones admin
-- Idempotente: seguro de re-ejecutar.

-- ── 1. creado_por en pedidos ───────────────────────────────────────────────
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- ── 2. creado_por en clientes ──────────────────────────────────────────────
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- ── 3. Tabla sesiones (log de logins exitosos) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.sesiones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  email       TEXT,
  ip          TEXT,
  user_agent  TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sesiones_usuario_idx ON public.sesiones (usuario_id);
CREATE INDEX IF NOT EXISTS sesiones_creado_idx  ON public.sesiones (creado_en DESC);

-- ── 4. Tabla clientes_log (altas y ediciones de registros de cliente) ───────
CREATE TABLE IF NOT EXISTS public.clientes_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID        REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefono       TEXT,
  accion         TEXT        NOT NULL,   -- 'CREAR' | 'EDITAR'
  campos_antes   JSONB,
  campos_despues JSONB,
  realizado_por  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS clientes_log_cliente_idx  ON public.clientes_log (cliente_id);
CREATE INDEX IF NOT EXISTS clientes_log_creado_idx   ON public.clientes_log (creado_en DESC);

-- ── 5. Tabla admin_log (roles, permisos, config, descuentos, usuarios) ──────
CREATE TABLE IF NOT EXISTS public.admin_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  accion        TEXT        NOT NULL,
  -- ROL_RENOMBRAR, ROL_PERMISOS_EDITAR, ROL_ELIMINAR,
  -- USUARIO_EDITAR, CONFIG_CAMBIAR,
  -- DESCUENTO_CREAR, DESCUENTO_EDITAR, DESCUENTO_ELIMINAR
  entidad       TEXT,                    -- clave del rol, id de usuario, clave config...
  detalle       JSONB,
  realizado_por UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_log_accion_idx    ON public.admin_log (accion);
CREATE INDEX IF NOT EXISTS admin_log_usuario_idx   ON public.admin_log (realizado_por);
CREATE INDEX IF NOT EXISTS admin_log_creado_idx    ON public.admin_log (creado_en DESC);

-- ── 6. Tabla catalogo_cambios (precio, stock y otros campos del catálogo) ───
CREATE TABLE IF NOT EXISTS public.catalogo_cambios (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID        REFERENCES public.catalogo_cases(case_id) ON DELETE SET NULL,
  accion         TEXT        NOT NULL,   -- 'CREAR' | 'EDITAR' | 'ELIMINAR'
  campo          TEXT,                   -- campo específico que cambió; NULL en CREAR/ELIMINAR
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  realizado_por  UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS catalogo_cambios_case_idx    ON public.catalogo_cambios (case_id);
CREATE INDEX IF NOT EXISTS catalogo_cambios_creado_idx  ON public.catalogo_cambios (creado_en DESC);
