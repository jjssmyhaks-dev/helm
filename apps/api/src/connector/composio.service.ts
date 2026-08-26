import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Composio } from '@composio/core';

/**
 * Composio-powered connector service.
 * Uses Composio's session-based API to provide 1000+ tool integrations.
 *
 * Supported Google Workspace tools:
 * - Google Sheets: read, write, create spreadsheets, formulas
 * - Google Calendar: create events, check availability, manage invites
 * - Google Docs: create/edit documents, format content
 * - Gmail: send, read, search, draft emails
 * - Google Drive: upload, download, share files
 */
@Injectable()
export class ComposioService implements OnModuleInit {
  private readonly logger = new Logger(ComposioService.name);
  private composio!: Composio;

  /** Map of Composio app names to Helm connector names */
  private readonly APP_MAP: Record<string, string> = {
    // Search & Research
    'googlesearch': 'web-search',
    // Marketing
    'googleads': 'google-ads',
    'metaads': 'meta-ads',
    'figma': 'figma',
    'canva': 'canva',
    'instagram': 'instagram',
    'linkedin': 'linkedin',
    // Operations
    'whatsapp': 'whatsapp',
    'slack': 'slack',
    'trello': 'trello',
    'asana': 'asana',
    'notion': 'notion',
    // Google Workspace
    'googlesheets': 'google-sheets',
    'gmail': 'gmail',
    'googlecalendar': 'google-calendar',
    'googledocs': 'google-docs',
    'googledrive': 'google-drive',
    // Finance
    'tally': 'tally',
    'stripe': 'stripe',
    'razorpay': 'razorpay',
    // Communication
    'twitter': 'twitter',
    'youtube': 'youtube',
  };

  /** Human-readable names for connectors */
  private readonly DISPLAY_NAMES: Record<string, string> = {
    'web-search': 'Web Search',
    'google-ads': 'Google Ads',
    'meta-ads': 'Meta Ads',
    'figma': 'Figma',
    'canva': 'Canva',
    'instagram': 'Instagram',
    'linkedin': 'LinkedIn',
    'whatsapp': 'WhatsApp Business',
    'slack': 'Slack',
    'trello': 'Trello',
    'asana': 'Asana',
    'notion': 'Notion',
    'google-sheets': 'Google Sheets',
    'gmail': 'Gmail',
    'google-calendar': 'Google Calendar',
    'google-docs': 'Google Docs',
    'google-drive': 'Google Drive',
    'tally': 'Tally (India)',
    'stripe': 'Stripe',
    'razorpay': 'Razorpay',
    'twitter': 'Twitter / X',
    'youtube': 'YouTube',
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
    this.logger.log('Composio initialized with 22 app integrations');
  }

  /** Get or create a session for a founder. */
  async getSession(founderId: string) {
    if (!this.composio) {
      throw new Error('Composio not initialized. Set COMPOSIO_API_KEY.');
    }

    if (this.sessions.has(founderId)) {
      return this.sessions.get(founderId);
    }

    const session = await this.composio.create(founderId, {
      toolkits: Object.keys(this.APP_MAP),
    });

    this.sessions.set(founderId, session);
    this.logger.log(`Created Composio session for founder ${founderId}`);
    return session;
  }

  /** Get all available tools for a founder. */
  async getToolsForFounder(founderId: string) {
    const session = await this.getSession(founderId);
    const tools = await session.tools();
    return tools;
  }

  /** Execute a tool action for a founder. */
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

  /** Get connection status for all connectors for a founder. */
  async getConnectionStatus(founderId: string) {
    if (!this.composio) {
      return Object.entries(this.APP_MAP).map(([app, name]) => ({
        name,
        displayName: this.DISPLAY_NAMES[name] || this.formatName(app),
        connected: false,
        status: 'Composio not configured',
      }));
    }

    try {
      const session = await this.getSession(founderId);
      const tools = await session.tools();

      const appTools = new Map<string, any[]>();
      for (const tool of tools) {
        const app = tool.name?.split('_')[0] || 'unknown';
        if (!appTools.has(app)) appTools.set(app, []);
        appTools.get(app)!.push(tool);
      }

      return Object.entries(this.APP_MAP).map(([app, name]) => ({
        name,
        displayName: this.DISPLAY_NAMES[name] || this.formatName(app),
        connected: appTools.has(app),
        status: appTools.has(app) ? 'connected' : 'not_connected',
        toolCount: appTools.get(app)?.length || 0,
      }));
    } catch (err) {
      this.logger.error(`Failed to get connection status: ${err}`);
      return Object.entries(this.APP_MAP).map(([app, name]) => ({
        name,
        displayName: this.DISPLAY_NAMES[name] || this.formatName(app),
        connected: false,
        status: 'error',
      }));
    }
  }

  /** Get available actions for a specific app. */
  async getActionsForApp(appName: string) {
    const session = await this.getSession('system');
    const tools = await session.tools();
    return tools.filter((tool: any) =>
      tool.name?.toLowerCase().includes(appName.toLowerCase()),
    );
  }

  /** Health check */
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
