-- ============================================================
-- SISTEMA PARROQUIAL — Base de datos PostgreSQL
-- Santuario Mariano Nuestra Señora del Rosario, Huarmey, Áncash, Perú
-- ============================================================

-- Crear base de datos (ejecutar como superuser)
-- CREATE DATABASE parroquia_db ENCODING 'UTF8' LC_COLLATE 'es_PE.UTF-8' LC_CTYPE 'es_PE.UTF-8';

-- ── EXTENSIONES ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ── USUARIOS DEL SISTEMA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username     VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  nombre       VARCHAR(150) NOT NULL,
  rol          VARCHAR(20)  NOT NULL CHECK (rol IN ('parroco','secretaria','consulta')),
  activo       BOOLEAN      DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  creado_en    TIMESTAMPTZ  DEFAULT NOW()
);

-- ── CONFIGURACIÓN PARROQUIA ──────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion (
  clave  VARCHAR(80) PRIMARY KEY,
  valor  TEXT,
  descripcion VARCHAR(200)
);

-- ── FELIGRESES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feligreses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres           VARCHAR(120) NOT NULL,
  apellidos         VARCHAR(120) NOT NULL,
  dni               VARCHAR(8)   UNIQUE NOT NULL,
  dni_verificado    BOOLEAN      DEFAULT false,
  apodo             VARCHAR(60),
  fecha_nacimiento  DATE,
  sexo              CHAR(1)      CHECK (sexo IN ('M','F')),
  nacionalidad      VARCHAR(60)  DEFAULT 'Peruana',
  lugar_nacimiento  VARCHAR(100),
  estado_civil      VARCHAR(30),
  ocupacion         VARCHAR(100),
  email             VARCHAR(150),
  telefono          VARCHAR(20),
  direccion         TEXT,
  parroquia_origen  VARCHAR(200),
  foto_url          TEXT,
  activo            BOOLEAN      DEFAULT true,
  notas             TEXT,
  reniec_data       JSONB,
  creado_en         TIMESTAMPTZ  DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ  DEFAULT NOW(),
  creado_por        UUID         REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_feligreses_dni      ON feligreses(dni);
CREATE INDEX IF NOT EXISTS idx_feligreses_apellidos ON feligreses(apellidos);
CREATE INDEX IF NOT EXISTS idx_feligreses_activo   ON feligreses(activo);
CREATE INDEX IF NOT EXISTS idx_feligreses_search   ON feligreses USING gin(to_tsvector('spanish', nombres || ' ' || apellidos));

-- ── SACRAMENTOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sacramentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feligres_id     UUID         NOT NULL REFERENCES feligreses(id) ON DELETE CASCADE,
  tipo            VARCHAR(30)  NOT NULL CHECK (tipo IN ('bautismo','eucaristia','confirmacion','penitencia','matrimonio','uncion','ordenacion')),
  fecha           DATE         NOT NULL,
  parroquia       VARCHAR(200),
  libro           VARCHAR(20),
  folio           VARCHAR(20),
  partida         VARCHAR(20),
  padrino_id      UUID         REFERENCES feligreses(id),
  madrina_id      UUID         REFERENCES feligreses(id),
  conyuge_id      UUID         REFERENCES feligreses(id),
  notas           TEXT,
  creado_en       TIMESTAMPTZ  DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ  DEFAULT NOW(),
  creado_por      UUID         REFERENCES usuarios(id),
  UNIQUE(feligres_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_sacramentos_feligres ON sacramentos(feligres_id);
CREATE INDEX IF NOT EXISTS idx_sacramentos_tipo     ON sacramentos(tipo);
CREATE INDEX IF NOT EXISTS idx_sacramentos_fecha    ON sacramentos(fecha);

-- ── DOCUMENTOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feligres_id     UUID         NOT NULL REFERENCES feligreses(id) ON DELETE CASCADE,
  sacramento_id   UUID         REFERENCES sacramentos(id) ON DELETE SET NULL,
  nombre_archivo  VARCHAR(300) NOT NULL,
  nombre_original VARCHAR(300) NOT NULL,
  tipo_mime       VARCHAR(100),
  tamanio_bytes   INTEGER,
  categoria       VARCHAR(100) DEFAULT 'General',
  descripcion     TEXT,
  ruta_almacen    TEXT         NOT NULL,
  subido_en       TIMESTAMPTZ  DEFAULT NOW(),
  subido_por      UUID         REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_docs_feligres    ON documentos(feligres_id);
CREATE INDEX IF NOT EXISTS idx_docs_sacramento  ON documentos(sacramento_id);

-- ── AGENDA ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agenda (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha       DATE         NOT NULL,
  hora        TIME,
  tipo        VARCHAR(50)  NOT NULL,
  titulo      VARCHAR(200) NOT NULL,
  descripcion TEXT,
  celebrante  VARCHAR(200),
  lugar       VARCHAR(200),
  estado      VARCHAR(30)  DEFAULT 'programado' CHECK (estado IN ('programado','realizado','cancelado')),
  creado_en   TIMESTAMPTZ  DEFAULT NOW(),
  creado_por  UUID         REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_fecha ON agenda(fecha);

-- ── AUDITORÍA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID         REFERENCES usuarios(id),
  accion      VARCHAR(50)  NOT NULL,
  tabla       VARCHAR(50),
  registro_id UUID,
  detalle     JSONB,
  ip          VARCHAR(50),
  fecha       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha   ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);

-- ── TRIGGER: actualizado_en automático ───────────────────────
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_feligreses_upd
  BEFORE UPDATE ON feligreses
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_sacramentos_upd
  BEFORE UPDATE ON sacramentos
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ── DATOS INICIALES ──────────────────────────────────────────
-- Contraseñas: parroco123 | secre123 | ver123
INSERT INTO usuarios (username, password_hash, nombre, rol) VALUES
  ('parroco',    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'P. Juan Pablo Herrera', 'parroco'),
  ('secretaria', '$2a$10$rIC/Pn4axYMXO39jUBpeleGPOBFfhJNtJrOdCqvIAjHdR7T3.jJPi', 'Sra. Carmen Villanueva',     'secretaria'),
  ('consulta',   '$2a$10$WFJmGdVGaMoAp9jO5TF3Q.X7V/kiFkMRCxFT5rFGQvz30llUQzMci', 'Usuario Consulta',           'consulta')
ON CONFLICT (username) DO NOTHING;

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('parroquia',  'Santuario Mariano Nuestra Señora del Rosario',   'Nombre de la parroquia'),
  ('diocesis',   'Diócesis de Huaraz',                 'Diócesis a la que pertenece'),
  ('parroco',    'P. Juan Pablo Herrera',        'Nombre del párroco actual'),
  ('vicario',    'P. Miguel Torres',              'Nombre del vicario'),
  ('direccion',  'Jr. Bolívar 100, Huarmey, Áncash',  'Dirección física'),
  ('telefono',   '(043) 456-789',                    'Teléfono de contacto'),
  ('email',      'secretaria@santuariohuarmey.pe',         'Email oficial'),
  ('web',        'www.santuariohuarmey.pe',                'Sitio web'),
  ('ruc',        '20600001234',                       'RUC de la institución')
ON CONFLICT (clave) DO NOTHING;
