-- ============================================================================
-- Helm — Initial Migration
-- AI Operating System for Solo Founders
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE risk_tier AS ENUM ('auto_execute', 'notify_and_act', 'approval_required');
CREATE TYPE layer_name AS ENUM ('research', 'marketing', 'operations', 'finance');
CREATE TYPE agent_type AS ENUM ('global_orchestrator', 'layer_orchestrator', 'sub_agent');
CREATE TYPE agent_status AS ENUM ('idle', 'working', 'waiting_approval', 'error', 'offline');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'waiting_approval', 'completed', 'failed', 'cancelled');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'edited', 'expired');
CREATE TYPE auth_type AS ENUM ('oauth', 'api_key');
CREATE TYPE connector_auth_status AS ENUM ('not_connected', 'connected', 'needs_re_auth', 'error');
CREATE TYPE chat_role AS ENUM ('founder', 'agent', 'system');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE founders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_description TEXT DEFAULT '',
  autonomy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type agent_type NOT NULL,
  layer layer_name,
  status agent_status DEFAULT 'idle',
  config JSONB DEFAULT '{}',
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agents_founder_layer ON agents(founder_id, layer);
CREATE INDEX idx_agents_founder_status ON agents(founder_id, status);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  layer layer_name NOT NULL,
  status task_status DEFAULT 'pending',
  risk_tier risk_tier NOT NULL,
  result JSONB,
  error TEXT,
  assigned_agent_id UUID NOT NULL REFERENCES agents(id),
  parent_task_id UUID REFERENCES tasks(id),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_founder_status ON tasks(founder_id, status);
CREATE INDEX idx_tasks_founder_layer ON tasks(founder_id, layer);
CREATE INDEX idx_tasks_agent_status ON tasks(assigned_agent_id, status);

CREATE TABLE event_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  publisher_agent_id UUID NOT NULL REFERENCES agents(id),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  published_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_founder_type ON event_signals(founder_id, signal_type);
CREATE INDEX idx_events_published ON event_signals(published_at);

CREATE TABLE event_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_type TEXT NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, signal_type, founder_id)
);

CREATE INDEX idx_subscriptions_signal ON event_subscriptions(signal_type);

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_description TEXT NOT NULL,
  action_payload JSONB DEFAULT '{}',
  reasoning TEXT DEFAULT '',
  risk_tier risk_tier NOT NULL,
  status approval_status DEFAULT 'pending',
  resolution_note TEXT,
  edited_payload JSONB,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_approvals_founder_status ON approvals(founder_id, status);
CREATE INDEX idx_approvals_status_created ON approvals(status, created_at);

CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  mcp_server_endpoint TEXT NOT NULL,
  auth_type auth_type NOT NULL,
  auth_status connector_auth_status DEFAULT 'not_connected',
  encrypted_credentials TEXT,
  scopes TEXT[] DEFAULT '{}',
  used_by_layers layer_name[] DEFAULT '{}',
  last_successful_call TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_connectors_founder_name ON connectors(founder_id, name);

CREATE TABLE context_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(founder_id, key)
);

CREATE INDEX idx_context_notes_founder_tags ON context_notes(founder_id, tags);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  risk_tier risk_tier NOT NULL,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_founder_created ON activity_log(founder_id, created_at);
CREATE INDEX idx_activity_agent_created ON activity_log(agent_id, created_at);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  founder_id UUID NOT NULL REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_founder_updated ON chat_sessions(founder_id, updated_at);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role chat_role NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  founder_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_session_created ON chat_messages(session_id, created_at);

-- ---------------------------------------------------------------------------
-- Row-Level Security Policies
-- ---------------------------------------------------------------------------

ALTER TABLE founders ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policy: founders can only see their own data
CREATE POLICY founders_isolation ON founders
  USING (id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY agents_isolation ON agents
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY tasks_isolation ON tasks
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY events_isolation ON event_signals
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY subscriptions_isolation ON event_subscriptions
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY approvals_isolation ON approvals
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY connectors_isolation ON connectors
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY context_isolation ON context_notes
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY activity_isolation ON activity_log
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY sessions_isolation ON chat_sessions
  USING (founder_id = current_setting('app.current_founder_id')::UUID);

CREATE POLICY messages_isolation ON chat_messages
  USING (session_id IN (
    SELECT id FROM chat_sessions
    WHERE founder_id = current_setting('app.current_founder_id')::UUID
  ));
