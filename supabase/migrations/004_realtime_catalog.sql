-- ============================================================
-- Kiosko Manuela — Migración 004: Realtime para catálogo
-- ============================================================
-- Habilita Realtime en products y categories para que el kiosko
-- reciba cambios del admin sin necesidad de reiniciar.

ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
