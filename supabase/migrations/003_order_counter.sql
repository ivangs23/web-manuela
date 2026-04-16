-- ============================================================
-- Kiosko Manuela — Migración 003: contador de pedidos atómico
-- ============================================================
-- Sustituye el contador en localStorage por una tabla en Supabase.
-- La función next_order_number() es atómica con FOR UPDATE,
-- lo que evita duplicados cuando corren múltiples instancias.

CREATE TABLE IF NOT EXISTS order_counter (
  date        DATE    PRIMARY KEY,
  last_number SMALLINT NOT NULL DEFAULT 0
);

-- Lectura y escritura pública (los kioscos no tienen sesión auth)
ALTER TABLE order_counter ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_rw_order_counter" ON order_counter FOR ALL USING (true) WITH CHECK (true);

-- ── Función atómica ────────────────────────────────────────────
-- Incrementa el contador del día actual y lo devuelve.
-- Si el número supera 100, hace un ciclo a 1.
-- Usa FOR UPDATE para garantizar exclusión mutua.
CREATE OR REPLACE FUNCTION next_order_number()
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today      DATE    := CURRENT_DATE;
  next_num   SMALLINT;
BEGIN
  -- Intentar actualizar la fila existente con bloqueo
  UPDATE order_counter
     SET last_number = CASE WHEN last_number >= 100 THEN 1 ELSE last_number + 1 END
   WHERE date = today
  RETURNING last_number INTO next_num;

  -- Si no existía fila para hoy, insertar con número 1
  IF NOT FOUND THEN
    INSERT INTO order_counter (date, last_number) VALUES (today, 1)
    ON CONFLICT (date) DO UPDATE
      SET last_number = CASE WHEN order_counter.last_number >= 100 THEN 1 ELSE order_counter.last_number + 1 END
    RETURNING last_number INTO next_num;
  END IF;

  RETURN next_num;
END;
$$;

-- Limpiar filas de días anteriores (mantener solo los últimos 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_order_counters()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM order_counter WHERE date < CURRENT_DATE - INTERVAL '30 days';
$$;
