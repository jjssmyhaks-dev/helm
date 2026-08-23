import { BaseMCPServer, MCPTool, MCPToolCall, MCPToolResult } from './mcp-server.interface.js';

/**
 * Meta Ads MCP Server
 * Provides Facebook/Instagram ad campaign management capabilities.
 * Uses the Meta Marketing API (graph.facebook.com).
 */
export class MetaAdsMCPServer extends BaseMCPServer {
  readonly name = 'meta-ads';
  readonly displayName = 'Meta Ads';
  readonly description = 'Facebook and Instagram ad campaign management';

  private accessToken: string = '';
  private adAccountId: string = '';
  private baseUrl = 'https://graph.facebook.com/v19.0';

  protected async authenticate(): Promise<void> {
    this.accessToken = this.credentials['accessToken'] || process.env.META_ACCESS_TOKEN || '';
    this.adAccountId = this.credentials['adAccountId'] || process.env.META_AD_ACCOUNT_ID || '';
    this.authenticated = !!(this.accessToken && this.adAccountId);
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'list_campaigns',
        description: 'List all ad campaigns with their status, budget, and performance metrics.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: ACTIVE, PAUSED, ARCHIVED' },
            limit: { type: 'number', description: 'Max results', default: 10 },
          },
        },
      },
      {
        name: 'get_campaign_performance',
        description: 'Get detailed performance metrics for a specific campaign.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID' },
            dateRange: { type: 'string', description: 'Date range: 7d, 30d, 90d', default: '30d' },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'get_ad_spend_summary',
        description: 'Get total ad spend and budget pacing for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'Period: today, this_week, this_month', default: 'this_month' },
          },
        },
      },
      {
        name: 'create_campaign',
        description: 'Create a new ad campaign.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            objective: { type: 'string', description: 'Campaign objective: OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES' },
            dailyBudget: { type: 'number', description: 'Daily budget in cents' },
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
          required: ['name', 'objective', 'dailyBudget'],
        },
      },
      {
        name: 'pause_campaign',
        description: 'Pause an active campaign.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID to pause' },
          },
          required: ['campaignId'],
        },
      },
      {
        name: 'get_audience_insights',
        description: 'Get audience insights and demographics for campaign performance.',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string', description: 'Campaign ID' },
          },
          required: ['campaignId'],
        },
      },
    ];
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (call.name) {
        case 'list_campaigns':
          return await this.listCampaigns(call.arguments);
        case 'get_campaign_performance':
          return await this.getCampaignPerformance(call.arguments);
        case 'get_ad_spend_summary':
          return await this.getAdSpendSummary(call.arguments);
        case 'create_campaign':
          return await this.createCampaign(call.arguments);
        case 'pause_campaign':
          return await this.pauseCampaign(call.arguments);
        case 'get_audience_insights':
          return await this.getAudienceInsights(call.arguments);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${call.name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Meta Ads API error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async apiGet(path: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('access_token', this.accessToken);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private async listCampaigns(args: Record<string, unknown>): Promise<MCPToolResult> {
    const params: Record<string, string> = {
      fields: 'name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights{impressions,clicks,spend,actions,cost_per_action_type}',
      limit: String(args.limit || 10),
    };
    if (args.status) params.filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: [args.status] }]);

    const data = await this.apiGet(`/act_${this.adAccountId}/campaigns`, params);

    const campaigns = data.data?.map((c: any) => {
      const insights = c.insights?.data?.[0] || {};
      return [
        `Campaign: ${c.name} (${c.status})`,
        `  ID: ${c.id}`,
        `  Objective: ${c.objective}`,
        `  Daily Budget: $${((c.daily_budget || 0) / 100).toFixed(2)}`,
        `  Impressions: ${insights.impressions || 0}`,
        `  Clicks: ${insights.clicks || 0}`,
        `  Spend: $${parseFloat(insights.spend || '0').toFixed(2)}`,
        `  CTR: ${insights.ctr ? `${parseFloat(insights.ctr).toFixed(2)}%` : 'N/A'}`,
      ].join('\n');
    }).join('\n\n') || 'No campaigns found.';

    return { content: [{ type: 'text', text: campaigns }] };
  }

  private async getCampaignPerformance(args: Record<string, unknown>): Promise<MCPToolResult> {
    const campaignId = args.campaignId as string;
    const data = await this.apiGet(`/${campaignId}`, {
      fields: 'name,status,objective,daily_budget,insights{impressions,clicks,spend,actions,cost_per_action_type,reach,frequency,cpm,cpc}',
    });

    const campaign = data;
    const insights = campaign.insights?.data?.[0] || {};

    const text = [
      `Campaign: ${campaign.name}`,
      `Status: ${campaign.status}`,
      `Objective: ${campaign.objective}`,
      '',
      'Performance Metrics:',
      `  Impressions: ${insights.impressions || 0}`,
      `  Reach: ${insights.reach || 0}`,
      `  Frequency: ${insights.frequency || 0}`,
      `  Clicks: ${insights.clicks || 0}`,
      `  CTR: ${insights.ctr ? `${parseFloat(insights.ctr).toFixed(2)}%` : 'N/A'}`,
      `  CPC: $${parseFloat(insights.cpc || '0').toFixed(2)}`,
      `  CPM: $${parseFloat(insights.cpm || '0').toFixed(2)}`,
      `  Total Spend: $${parseFloat(insights.spend || '0').toFixed(2)}`,
      '',
      'Actions:',
      ...(insights.actions || []).map((a: any) => `  ${a.action_type}: ${a.value} ($${parseFloat(a.cost_per_action_type || '0').toFixed(2)}/action)`),
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async getAdSpendSummary(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(`/${this.adAccountId}`, {
      fields: 'name,amount_spent,balance,currency,spend_cap',
    });

    const text = [
      `Account: ${data.name}`,
      `Currency: ${data.currency}`,
      `Total Spent: $${(parseFloat(data.amount_spent || '0') / 100).toFixed(2)}`,
      `Balance: $${(parseFloat(data.balance || '0') / 100).toFixed(2)}`,
      `Spend Cap: ${data.spend_cap ? `$${(parseFloat(data.spend_cap) / 100).toFixed(2)}` : 'None'}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async createCampaign(args: Record<string, unknown>): Promise<MCPToolResult> {
    const result = await this.apiPost(`/act_${this.adAccountId}/campaigns`, {
      name: args.name,
      objective: args.objective,
      status: 'PAUSED',
      special_ad_categories: [],
      daily_budget: args.dailyBudget,
      start_time: args.startDate ? `${args.startDate}T00:00:00+0000` : undefined,
      stop_time: args.endDate ? `${args.endDate}T23:59:59+0000` : undefined,
    });

    return {
      content: [{ type: 'text', text: `Campaign created successfully!\nID: ${result.id}\nName: ${args.name}\nStatus: PAUSED (ready to activate)` }],
    };
  }

  private async pauseCampaign(args: Record<string, unknown>): Promise<MCPToolResult> {
    await this.apiPost(`/${args.campaignId}`, { status: 'PAUSED' });
    return { content: [{ type: 'text', text: `Campaign ${args.campaignId} paused successfully.` }] };
  }

  private async getAudienceInsights(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(`/${args.campaignId}/insights`, {
      fields: 'impressions,clicks,actions,action_values,unique_actions',
      breakdowns: 'age,gender',
    });

    const text = (data.data || [])
      .map((row: any) => `${row.age || 'Unknown'} ${row.gender || ''}: ${row.impressions || 0} impressions, ${row.clicks || 0} clicks`)
      .join('\n') || 'No audience data available.';

    return { content: [{ type: 'text', text: `Audience Insights:\n${text}` }] };
  }
}
