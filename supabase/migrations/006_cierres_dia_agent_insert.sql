-- ============================================================
-- Kiosko Manuela — Migración 006: permitir cierre de caja al agente
-- ============================================================
-- El agente impresora usa la anon key (sin sesión auth) para
-- registrar el cierre de caja en cierres_dia. La política de la
-- migración 005 ("cierres_dia_all_auth", FOR ALL, auth.uid() IS NOT NULL)
-- bloquea ese INSERT y rompía el cierre de caja desde el agente.
-- Se añade INSERT público (como en el proyecto anterior) y SELECT
-- público para que el agente pueda leer el cierre recién creado
-- (.select().single() tras el insert). Idempotente.

DROP POLICY IF EXISTS "cierres_dia_insert_public" ON cierres_dia;
CREATE POLICY "cierres_dia_insert_public" ON cierres_dia
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "cierres_dia_select_public" ON cierres_dia;
CREATE POLICY "cierres_dia_select_public" ON cierres_dia
  FOR SELECT USING (true);

-- Nota: UPDATE/DELETE siguen requiriendo usuario autenticado
-- (política "cierres_dia_all_auth" de la migración 005).
