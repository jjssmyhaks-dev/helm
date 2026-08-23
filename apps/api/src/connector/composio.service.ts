import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Composio } from '@composio/core';

/**
 * Composio-powered connector service.
 * Uses Composio's session-based API to provide 1000+ tool integrations.
 *
 * Flow:
 * 1. Create a session per founder
 * 2. Get tools from the session
 * 3. Pass tools to agents
 * 4. Agents execute tools through the session
 */
@Injectable()
export class ComposioService implements OnModuleInit {
  private readonly logger = new Logger(ComposioService.name);
  private composio!: Composio;

  /** Map of Composio app names to Helm connector names */
  private readonly APP_MAP: Record<string, string> = {
    'googlesearch': 'web-search',
    'googleads': 'google-ads',
    'metaads': 'meta-ads',
    'figma': 'figma',
    'canva': 'canva',
    'instagram': 'instagram',
    'linkedin': 'linkedin',
    'whatsapp': 'whatsapp',
    'slack': 'slack',
    'googlesheets': 'google-sheets',
    'gmail': 'gmail',
    'googlecalendar': 'google-calendar',
    'tally': 'tally',
  };

  /** Cache sessions per founder */
  private sessions = new Map<string, any>();

  onModuleInit() {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      this.logger.warn('COMPOSIO_API_KEY not set. Composio connectors disabled.');
      return;
    }

    this.composio = new Composio({ apiKey });
    this.logger.log('Composio initialized successfully');
  }

  /**
   * Get or create a session for a founder.
   * Sessions are cached and reused across requests.
   */
  async getSession(founderId: string) {
    if (!this.composio) {
      throw new Error('Composio not initialized. Set COMPOSIO_API_KEY.');
    }

    // Return cached session if exists
    if (this.sessions.has(founderId)) {
      return this.sessions.get(founderId);
    }

    // Create new session
    const session = await this.composio.create(founderId, {
      toolkits: Object.keys(this.APP_MAP),
    });

    this.sessions.set(founderId, session);
    this.logger.log(`Created Composio session for founder ${founderId}`);

    return session;
  }

  /**
   * Get all available tools for a founder.
   * This is what agents call to get the tools they can use.
   */
  async getToolsForFounder(founderId: string) {
    const session = await this.getSession(founderId);
    const tools = await session.tools();
    return tools;
  }

  /**
   * Execute a tool action for a founder.
   */
  async executeAction(
    founderId: string,
    actionName: string,
    params: Record<string, unknown>,
  ) {
    const session = await this.getSession(founderId);

    this.logger.log(`Executing Composio action: ${actionName} for founder ${founderId}`);

    const result = await session.execute(actionName, params);
    return result;
  }

  /**
   * Get connection status for all connectors for a founder.
   */
  async getConnectionStatus(founderId: string) {
    if (!this.composio) {
      return Object.entries(this.APP_MAP).map(([app, name]) => ({
        name,
        displayName: this.formatName(app),
        connected: false,
        status: 'Composio not configured',
      }));
    }

    try {
      const session = await this.getSession(founderId);
      const tools = await session.tools();

      // Group tools by app
      const appTools = new Map<string, any[]>();
      for (const tool of tools) {
        const app = tool.name?.split('_')[0] || 'unknown';
        if (!appTools.has(app)) appTools.set(app, []);
        appTools.get(app)!.push(tool);
      }

      return Object.entries(this.APP_MAP).map(([app, name]) => ({
        name,
        displayName: this.formatName(app),
        connected: appTools.has(app),
        status: appTools.has(app) ? 'connected' : 'not_connected',
        toolCount: appTools.get(app)?.length || 0,
      }));
    } catch (err) {
      this.logger.error(`Failed to get connection status: ${err}`);
      return Object.entries(this.APP_MAP).map(([app, name]) => ({
        name,
        displayName: this.formatName(app),
        connected: false,
        status: 'error',
      }));
    }
  }

  /**
   * Get available actions for a specific app.
   */
  async getActionsForApp(appName: string) {
    const session = await this.getSession('system');
    const tools = await session.tools();

    return tools.filter((tool: any) =>
      tool.name?.toLowerCase().includes(appName.toLowerCase()),
    );
  }

  /**
   * Health check - verify Composio is reachable.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.composio) return false;
    try {
      await this.composio.create('health-check');
      return true;
    } catch {
      return false;
    }
  }

  private formatName(app: string): string {
    return app
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
}
