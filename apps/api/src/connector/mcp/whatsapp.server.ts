import { BaseMCPServer, MCPTool, MCPToolCall, MCPToolResult } from './mcp-server.interface.js';

/**
 * WhatsApp Business MCP Server
 * Provides WhatsApp Business API integration for customer/vendor communications.
 * Uses the WhatsApp Business Platform API (graph.facebook.com).
 */
export class WhatsAppMCPServer extends BaseMCPServer {
  readonly name = 'whatsapp';
  readonly displayName = 'WhatsApp Business';
  readonly description = 'Customer and vendor communication via WhatsApp Business API';

  private accessToken: string = '';
  private phoneNumberId: string = '';
  private businessAccountId: string = '';
  private baseUrl = 'https://graph.facebook.com/v19.0';

  protected async authenticate(): Promise<void> {
    this.accessToken = this.credentials['accessToken'] || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = this.credentials['phoneNumberId'] || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = this.credentials['businessAccountId'] || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.authenticated = !!(this.accessToken && this.phoneNumberId);
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'send_text_message',
        description: 'Send a text message to a WhatsApp number.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number (with country code, no +)' },
            message: { type: 'string', description: 'Message text (max 4096 characters)' },
          },
          required: ['to', 'message'],
        },
      },
      {
        name: 'send_template_message',
        description: 'Send a pre-approved template message.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Recipient phone number' },
            templateName: { type: 'string', description: 'Template name' },
            language: { type: 'string', description: 'Template language code', default: 'en' },
            parameters: { type: 'array', items: { type: 'string' }, description: 'Template parameters' },
          },
          required: ['to', 'templateName'],
        },
      },
      {
        name: 'get_conversations',
        description: 'List recent conversations/messages.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of conversations', default: 10 },
          },
        },
      },
      {
        name: 'get_message_status',
        description: 'Check delivery status of a sent message.',
        inputSchema: {
          type: 'object',
          properties: {
            messageId: { type: 'string', description: 'WhatsApp message ID' },
          },
          required: ['messageId'],
        },
      },
      {
        name: 'send_order_update',
        description: 'Send an order/shipping update notification.',
        inputSchema: {
          type: 'object',
          properties: {
            to: { type: 'string', description: 'Customer phone number' },
            orderNumber: { type: 'string', description: 'Order number' },
            status: { type: 'string', description: 'Order status: confirmed, shipped, delivered' },
            trackingUrl: { type: 'string', description: 'Tracking URL (optional)' },
          },
          required: ['to', 'orderNumber', 'status'],
        },
      },
    ];
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (call.name) {
        case 'send_text_message':
          return await this.sendTextMessage(call.arguments);
        case 'send_template_message':
          return await this.sendTemplateMessage(call.arguments);
        case 'get_conversations':
          return await this.getConversations(call.arguments);
        case 'get_message_status':
          return await this.getMessageStatus(call.arguments);
        case 'send_order_update':
          return await this.sendOrderUpdate(call.arguments);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${call.name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `WhatsApp API error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private async apiGet(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private async sendTextMessage(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiPost(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: args.to,
      type: 'text',
      text: { body: args.message },
    });

    return {
      content: [{ type: 'text', text: `Message sent!\nID: ${data.messages?.[0]?.id}\nTo: ${args.to}` }],
    };
  }

  private async sendTemplateMessage(args: Record<string, unknown>): Promise<MCPToolResult> {
    const template: any = {
      name: args.templateName,
      language: { code: args.language || 'en' },
    };

    if (args.parameters && (args.parameters as string[]).length > 0) {
      template.components = [{
        type: 'body',
        parameters: (args.parameters as string[]).map((p) => ({ type: 'text', text: p })),
      }];
    }

    const data = await this.apiPost(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: args.to,
      type: 'template',
      template,
    });

    return {
      content: [{ type: 'text', text: `Template message sent!\nID: ${data.messages?.[0]?.id}\nTemplate: ${args.templateName}` }],
    };
  }

  private async getConversations(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(
      `/${this.businessAccountId}/conversations?limit=${args.limit || 10}`,
    );

    const conversations = (data.data || [])
      .map((c: any) => `ID: ${c.id} | Status: ${c.status} | Last: ${c.updated_at}`)
      .join('\n');

    return { content: [{ type: 'text', text: conversations || 'No conversations found.' }] };
  }

  private async getMessageStatus(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(`/${args.messageId}`);

    const status = data.status || 'unknown';
    const text = [
      `Message ID: ${args.messageId}`,
      `Status: ${status}`,
      `Timestamp: ${data.timestamp}`,
      ...(data.errors || []).map((e: any) => `Error: ${e.title} - ${e.message}`),
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async sendOrderUpdate(args: Record<string, unknown>): Promise<MCPToolResult> {
    const statusMessages: Record<string, string> = {
      confirmed: `Your order #${args.orderNumber} has been confirmed! We're preparing it now.`,
      shipped: `Great news! Your order #${args.orderNumber} has been shipped.${args.trackingUrl ? `\nTrack it here: ${args.trackingUrl}` : ''}`,
      delivered: `Your order #${args.orderNumber} has been delivered. Thank you for your purchase!`,
    };

    const message = statusMessages[args.status as string] || `Order #${args.orderNumber} status: ${args.status}`;

    return await this.sendTextMessage({ to: args.to, message });
  }
}
