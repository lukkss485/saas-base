CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  mp_payment_id TEXT UNIQUE,
  plan TEXT,
  status TEXT,
  amount NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_codes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campos novos de tarefa
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'media';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Histórico de ações (alimenta a atividade recente e o gráfico)
CREATE TABLE IF NOT EXISTS task_events (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  task_id INT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_events_user_idx ON task_events (user_id, created_at);

-- Tarefas que já existiam ganham um evento de criação (roda só uma vez por tarefa)
INSERT INTO task_events (user_id, task_id, title, kind, created_at)
SELECT t.user_id, t.id, t.title, 'created', t.created_at
FROM tasks t
WHERE NOT EXISTS (SELECT 1 FROM task_events e WHERE e.task_id = t.id);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id INT REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks (project_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

CREATE TABLE IF NOT EXISTS team_members (
  id SERIAL PRIMARY KEY,
  owner_id INT REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'membro',
  status TEXT NOT NULL DEFAULT 'pendente',
  invited_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (owner_id, email)
);

CREATE TABLE IF NOT EXISTS important_days (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  UNIQUE (user_id, day)
);  

CREATE TABLE IF NOT EXISTS activity_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_session_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INT NOT NULL CHECK (duration_seconds BETWEEN 0 AND 86400),
  distance_meters DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (distance_meters >= 0),
  steps INT NOT NULL DEFAULT 0 CHECK (steps >= 0),
  calories_kcal DOUBLE PRECISION,
  average_heart_rate INT,
  max_heart_rate INT,
  source TEXT NOT NULL CHECK (source IN ('gps', 'healthkit', 'bluetooth', 'mixed')),
  route JSONB NOT NULL DEFAULT '[]'::jsonb,
  heart_rate_samples JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_session_id),
  CHECK (ended_at >= started_at),
  CHECK (average_heart_rate IS NULL OR average_heart_rate BETWEEN 1 AND 250),
  CHECK (max_heart_rate IS NULL OR max_heart_rate BETWEEN 1 AND 250)
);
CREATE INDEX IF NOT EXISTS activity_sessions_user_started_idx
  ON activity_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS project_pages (
  id SERIAL PRIMARY KEY,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Sem título',
  icon TEXT,
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_pages_project_idx ON project_pages (project_id, position);


-- ===== Financeiro =====
CREATE TABLE IF NOT EXISTS finance_accounts (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  institution           TEXT,
  type                  TEXT NOT NULL CHECK (type IN ('checking','savings','wallet','credit_card','investment','other')),
  opening_balance_cents INTEGER NOT NULL DEFAULT 0,
  opening_date          DATE NOT NULL,
  archived_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_categories (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 60),
  type        TEXT NOT NULL CHECK (type IN ('income','expense','both')),
  archived_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_categories_user_name_uq
  ON finance_categories (user_id, lower(name));

CREATE TABLE IF NOT EXISTS finance_transactions (
  id                     SERIAL PRIMARY KEY,
  user_id                INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                   TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  description            TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 120),
  amount_cents           INTEGER NOT NULL CHECK (amount_cents > 0),
  account_id             INT NOT NULL REFERENCES finance_accounts(id),
  destination_account_id INT REFERENCES finance_accounts(id),
  category_id            INT REFERENCES finance_categories(id),
  state                  TEXT NOT NULL CHECK (state IN ('settled','pending')),
  due_date               DATE,
  effective_date         DATE,
  notes                  TEXT CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ,
  CHECK (type <> 'transfer' OR (destination_account_id IS NOT NULL
                                AND destination_account_id <> account_id
                                AND category_id IS NULL)),
  CHECK (state <> 'settled' OR effective_date IS NOT NULL),
  CHECK (state <> 'pending' OR due_date IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS finance_idempotency_keys (
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  response   JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS finance_tx_settled_idx
  ON finance_transactions (user_id, effective_date) WHERE state = 'settled' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS finance_tx_pending_idx
  ON finance_transactions (user_id, due_date) WHERE state = 'pending' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS finance_tx_account_idx  ON finance_transactions (account_id);
CREATE INDEX IF NOT EXISTS finance_tx_category_idx ON finance_transactions (category_id);

CREATE TABLE IF NOT EXISTS finance_budgets (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  INT NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
  limit_cents  INTEGER NOT NULL CHECK (limit_cents > 0),
  period_month DATE NOT NULL,
  UNIQUE (user_id, category_id, period_month)
);

