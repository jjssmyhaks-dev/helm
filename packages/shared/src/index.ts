// ============================================================================
// Helm — Core Domain Types
// AI Operating System for Solo Founders
// ============================================================================

// ---------------------------------------------------------------------------
// Founders & Auth
// ---------------------------------------------------------------------------

export interface Founder {
  id: string;
  email: string;
  name: string;
  businessName: string;
  businessDescription: string;
  autonomySettings: AutonomySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutonomySettings {
  /** Per-layer risk tier overrides. Key = layer name, Value = default tier for that layer. */
  layerOverrides: Partial<Record<LayerName, RiskTier>>;
  /** Per-action-type overrides. Key = action type, Value = tier. */
  actionOverrides: Partial<Record<string, RiskTier>>;
}

// ---------------------------------------------------------------------------
// Risk Tiers
// ---------------------------------------------------------------------------

export enum RiskTier {
  /** Reversible, no cost. Auto-execute. */
  AUTO_EXECUTE = 1,
  /** Proceed but notify. Undo window. */
  NOTIFY_AND_ACT = 2,
  /** Synchronous approval required. */
  APPROVAL_REQUIRED = 3,
}

// ---------------------------------------------------------------------------
// Layers & Agents
// ---------------------------------------------------------------------------

export enum LayerName {
  RESEARCH = 'research',
  MARKETING = 'marketing',
  OPERATIONS = 'operations',
  FINANCE = 'finance',
}

export type AgentType = 'global_orchestrator' | 'layer_orchestrator' | 'sub_agent';

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  layer: LayerName | null; // null for global orchestrator
  status: AgentStatus;
  config: Record<string, unknown>;
  founderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  WAITING_APPROVAL = 'waiting_approval',
  ERROR = 'error',
  OFFLINE = 'offline',
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface Task {
  id: string;
  title: string;
  description: string;
  layer: LayerName;
  assignedAgentId: string;
  parentTaskId: string | null;
  status: TaskStatus;
  riskTier: RiskTier;
  result: Record<string, unknown> | null;
  founderId: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ---------------------------------------------------------------------------
// Events (Event Bus)
// ---------------------------------------------------------------------------

export interface EventSignal {
  id: string;
  type: SignalType;
  publisherAgentId: string;
  payload: Record<string, unknown>;
  founderId: string;
  publishedAt: Date;
}

export interface EventSubscription {
  id: string;
  agentId: string;
  signalType: SignalType;
  founderId: string;
  createdAt: Date;
}

/** All known signal types across the system. */
export type SignalType =
  // Research signals
  | 'competitor.detected'
  | 'market.trend_shift'
  | 'pricing.benchmark_changed'
  // Marketing signals
  | 'lead_source.underperforming'
  | 'campaign.budget_exhausted'
  | 'audience.segment_shift'
  // Operations signals
  | 'delivery.delayed'
  | 'capacity.constrained'
  | 'quality.issue_detected'
  // Finance signals
  | 'cashflow.risk'
  | 'expense.spike'
  | 'revenue.milestone_hit'
  // Cross-layer
  | 'research.requested'
  | 'operations.feature_shipped'
  | 'finance.budget_constraint'
  | 'marketing.demand_spike_incoming'
  | 'finance.budget_cut';

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export interface Approval {
  id: string;
  taskId: string;
  agentId: string;
  actionDescription: string;
  actionPayload: Record<string, unknown>;
  reasoning: string;
  riskTier: RiskTier;
  status: ApprovalStatus;
  founderId: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: ApprovalResolution | null;
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EDITED = 'edited',
  EXPIRED = 'expired',
}

export enum ApprovalResolution {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EDITED = 'edited',
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export interface Connector {
  id: string;
  name: string;
  displayName: string;
  description: string;
  mcpServerEndpoint: string;
  authType: AuthType;
  authStatus: AuthStatus;
  scopes: string[];
  usedByLayers: LayerName[];
  lastSuccessfulCall: Date | null;
  rateLimitStatus: RateLimitStatus | null;
  founderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum AuthType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
}

export enum AuthStatus {
  NOT_CONNECTED = 'not_connected',
  CONNECTED = 'connected',
  NEEDS_RE_AUTH = 'needs_re_auth',
  ERROR = 'error',
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetsAt: Date;
}

// ---------------------------------------------------------------------------
// Context / Memory
// ---------------------------------------------------------------------------

export interface ContextNote {
  id: string;
  founderId: string;
  key: string;
  value: string;
  embedding: number[] | null; // pgvector
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Activity Log
// ---------------------------------------------------------------------------

export interface ActivityLogEntry {
  id: string;
  founderId: string;
  agentId: string;
  action: string;
  details: Record<string, unknown>;
  riskTier: RiskTier;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  founderId: string;
  role: 'founder' | 'agent' | 'system';
  content: string;
  agentId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  founderId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

export interface SendMessageRequest {
  content: string;
  sessionId?: string;
}

export interface SendMessageResponse {
  message: ChatMessage;
  sessionId: string;
  spawnedTasks: Task[];
}

export interface ApprovalActionRequest {
  editedPayload?: Record<string, unknown>;
  reason?: string;
}

export interface ConnectorConnectRequest {
  authCode?: string;
  apiKey?: string;
}
