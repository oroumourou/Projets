-- Chaque table représente un type de donnée métier. Les clés étrangères
-- empêchent de rattacher une épreuve à un compte qui n'existe pas.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(80) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(120) NOT NULL,
    program VARCHAR(120) NOT NULL,
    university VARCHAR(160) NOT NULL,
    faculty VARCHAR(160) NOT NULL,
    exam_year SMALLINT,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(80) NOT NULL UNIQUE,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ces index accélèrent l'affichage des plus récentes et les suppressions de compte.
CREATE INDEX exams_created_at_idx ON exams (created_at DESC);
CREATE INDEX exams_uploader_id_idx ON exams (uploader_id);
