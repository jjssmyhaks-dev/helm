const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API error: ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async signup(data: { email: string; password: string; name: string; businessName: string }) {
    return this.request<{ token: string; founder: any }>('POST', '/auth/signup', data);
  }

  async login(data: { email: string; password: string }) {
    return this.request<{ token: string; founder: any }>('POST', '/auth/login', data);
  }

  // Chat
  async sendMessage(content: string, sessionId?: string) {
    return this.request<{
      message: any;
      sessionId: string;
      spawnedTasks: any[];
    }>('POST', '/chat/message', { content, sessionId });
  }

  /**
   * Stream a message response token-by-token via SSE.
   */
  async streamMessage(
    content: string,
    sessionId: string | undefined,
    onChunk: (chunk: string) => void,
    onSession: (sessionId: string) => void,
    onDone: () => void,
  ): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content, sessionId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'session') {
              onSession(data.sessionId);
            } else if (data.type === 'chunk') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              onDone();
              return;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            // Skip parse errors
          }
        }
      }
    }

    onDone();
  }

  async getChatHistory(sessionId: string) {
    return this.request<any>('GET', `/chat/history/${sessionId}`);
  }

  async listSessions() {
    return this.request<any[]>('GET', '/chat/sessions');
  }

  // Agents
  async listAgents(layer?: string) {
    const params = layer ? `?layer=${layer}` : '';
    return this.request<any[]>('GET', `/agents${params}`);
  }

  async getAgentActivity(agentId: string) {
    return this.request<any[]>('GET', `/agents/${agentId}/activity`);
  }

  // Tasks
  async listTasks(status?: string, layer?: string) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (layer) params.set('layer', layer);
    const qs = params.toString();
    return this.request<any[]>('GET', `/tasks${qs ? `?${qs}` : ''}`);
  }

  // Approvals
  async getPendingApprovals() {
    return this.request<any[]>('GET', '/approvals');
  }

  async approveAction(approvalId: string, reason?: string) {
    return this.request<any>('POST', `/approvals/${approvalId}/approve`, { reason });
  }

  async rejectAction(approvalId: string, reason?: string) {
    return this.request<any>('POST', `/approvals/${approvalId}/reject`, { reason });
  }

  async editAndApprove(approvalId: string, editedPayload: Record<string, unknown>, reason?: string) {
    return this.request<any>('POST', `/approvals/${approvalId}/edit`, { editedPayload, reason });
  }

  // Activity
  async getRecentActivity(limit = 50) {
    return this.request<any[]>('GET', `/activity?limit=${limit}`);
  }

  // Events
  async getRecentEvents() {
    return this.request<any[]>('GET', '/events/recent');
  }

  // Connectors
  async listConnectors() {
    return this.request<any[]>('GET', '/connectors');
  }

  async connectConnector(name: string, data?: { apiKey?: string }) {
    return this.request<any>('POST', `/connectors/${name}/connect`, data);
  }

  async disconnectConnector(name: string) {
    return this.request<any>('DELETE', `/connectors/${name}/disconnect`);
  }

  // Onboarding
  async getOnboardingState() {
    return this.request<any>('GET', '/onboarding');
  }

  async submitOnboardingAnswer(answer: string) {
    return this.request<any>('POST', '/onboarding/answer', { answer });
  }

  async skipOnboarding() {
    return this.request<any>('POST', '/onboarding/skip');
  }

  // Founder
  // Dashboard
  async getDashboard() {
    return this.request<any>('GET', '/dashboard');
  }

  // Settings
  async getAutonomySettings() {
    return this.request<any>('GET', '/founder/autonomy-settings');
  }

  // Founder
  async getProfile() {
    return this.request<any>('GET', '/founder/profile');
  }

  async updateAutonomySettings(settings: Record<string, unknown>) {
    return this.request<any>('PATCH', '/founder/autonomy-settings', { settings });
  }
}

export const api = new ApiClient();
