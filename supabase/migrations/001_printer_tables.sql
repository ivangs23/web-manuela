-- =============================================
-- Tablas para el sistema de impresoras
-- =============================================

-- Tabla de impresoras configuradas
CREATE TABLE IF NOT EXISTS printers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                    -- Ej: "Cocina", "Barra", "Terraza"
    ip TEXT NOT NULL,                      -- Ej: "192.168.1.122"
    port INTEGER NOT NULL DEFAULT 9100,
    type TEXT NOT NULL DEFAULT 'EPSON',    -- EPSON | STAR
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mapeo de categorías padre a impresoras
-- Solo se asignan categorías raíz/padre; los descendientes heredan
CREATE TABLE IF NOT EXISTS category_printer_map (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id TEXT NOT NULL,             -- FK al id de categories (string)
    printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category_id)                    -- Una categoría solo puede ir a una impresora
);

-- Asegurar que solo haya UNA impresora por defecto
CREATE UNIQUE INDEX IF NOT EXISTS idx_printers_single_default
    ON printers (is_default) WHERE is_default = TRUE;

-- Habilitar RLS
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_printer_map ENABLE ROW LEVEL SECURITY;

-- Políticas: lectura pública (el agente de impresora necesita leer), escritura solo autenticados
CREATE POLICY "Lectura pública de impresoras" ON printers FOR SELECT USING (true);
CREATE POLICY "Escritura autenticada de impresoras" ON printers FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Lectura pública de mapeo" ON category_printer_map FOR SELECT USING (true);
CREATE POLICY "Escritura autenticada de mapeo" ON category_printer_map FOR ALL USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at automático en printers
CREATE OR REPLACE FUNCTION update_printer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_printers_updated_at
    BEFORE UPDATE ON printers
    FOR EACH ROW
    EXECUTE FUNCTION update_printer_updated_at();

-- Habilitar Realtime para que el agente detecte cambios en config
ALTER PUBLICATION supabase_realtime ADD TABLE printers;
ALTER PUBLICATION supabase_realtime ADD TABLE category_printer_map;
