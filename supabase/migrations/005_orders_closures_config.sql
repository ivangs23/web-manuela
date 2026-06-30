-- ============================================================
-- Kiosko Manuela — Migración 005: pedidos, cierres_dia, configuracion
-- ============================================================
-- Tablas operativas reconstruidas desde el código de la app
-- (no existían como migración; vivían solo en el Studio del
-- proyecto anterior). Idempotente.

-- ── pedidos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number  TEXT,
  order_type    TEXT,
  table_number  TEXT,
  total_amount  NUMERIC(10,2),
  items         JSONB,
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos (created_at);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_select_public" ON pedidos;
DROP POLICY IF EXISTS "pedidos_insert_public" ON pedidos;
CREATE POLICY "pedidos_select_public" ON pedidos FOR SELECT USING (true);
CREATE POLICY "pedidos_insert_public" ON pedidos FOR INSERT WITH CHECK (true);

-- ── cierres_dia ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cierres_dia (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha              DATE,
  usuario_email      TEXT,
  usuario_id         UUID,
  total_ventas       NUMERIC(10,2),
  num_pedidos        INTEGER,
  num_pedidos_mesa   INTEGER,
  num_pedidos_llevar INTEGER,
  total_mesa         NUMERIC(10,2),
  total_llevar       NUMERIC(10,2),
  detalles           JSONB,
  estado             TEXT,
  historial          JSONB,
  created_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cierres_dia_fecha ON cierres_dia (fecha);

ALTER TABLE cierres_dia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cierres_dia_all_auth" ON cierres_dia;
CREATE POLICY "cierres_dia_all_auth" ON cierres_dia FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ── configuracion (fila única id=1) ────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  id                  INTEGER PRIMARY KEY,
  restaurante_abierto BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

INSERT INTO configuracion (id, restaurante_abierto) VALUES (1, TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "configuracion_select_public" ON configuracion;
DROP POLICY IF EXISTS "configuracion_write_auth" ON configuracion;
CREATE POLICY "configuracion_select_public" ON configuracion FOR SELECT USING (true);
CREATE POLICY "configuracion_write_auth" ON configuracion FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE configuracion; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
