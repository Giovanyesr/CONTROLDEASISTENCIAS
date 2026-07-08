-- Agregar columna genero a perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS genero VARCHAR(20) CHECK (genero IN ('masculino', 'femenino', 'otro'));
