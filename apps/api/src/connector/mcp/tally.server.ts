import { BaseMCPServer, MCPTool, MCPToolCall, MCPToolResult } from './mcp-server.interface.js';

/**
 * Tally MCP Server
 * Provides integration with Tally (popular Indian accounting software)
 * for bookkeeping sync, invoice management, and financial data access.
 */
export class TallyMCPServer extends BaseMCPServer {
  readonly name = 'tally';
  readonly displayName = 'Tally';
  readonly description = 'Bookkeeping sync, invoice management, and financial data for Indian SMBs';

  private apiKey: string = '';
  private companyId: string = '';
  private baseUrl = 'https://api.tally.in/v1';

  protected async authenticate(): Promise<void> {
    this.apiKey = this.credentials['apiKey'] || process.env.TALLY_API_KEY || '';
    this.companyId = this.credentials['companyId'] || process.env.TALLY_COMPANY_ID || '';
    this.authenticated = !!(this.apiKey && this.companyId);
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'get_transactions',
        description: 'Get recent financial transactions (income, expenses, transfers).',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            type: { type: 'string', description: 'Filter: income, expense, transfer, all', default: 'all' },
            limit: { type: 'number', description: 'Max results', default: 50 },
          },
        },
      },
      {
        name: 'get_ledger',
        description: 'Get ledger entries for account reconciliation.',
        inputSchema: {
          type: 'object',
          properties: {
            accountName: { type: 'string', description: 'Ledger account name' },
            startDate: { type: 'string', description: 'Start date' },
            endDate: { type: 'string', description: 'End date' },
          },
          required: ['accountName'],
        },
      },
      {
        name: 'get_invoices',
        description: 'List invoices with payment status.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter: paid, unpaid, overdue, all', default: 'all' },
            limit: { type: 'number', description: 'Max results', default: 20 },
          },
        },
      },
      {
        name: 'get_expense_summary',
        description: 'Get categorized expense summary for a period.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_bank_balances',
        description: 'Get current bank account balances.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_gst_summary',
        description: 'Get GST (Goods and Services Tax) summary for a period.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            period: { type: 'string', description: 'Period: monthly, quarterly', default: 'monthly' },
          },
        },
      },
      {
        name: 'create_journal_entry',
        description: 'Create a manual journal entry for bookkeeping.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Entry date (YYYY-MM-DD)' },
            debitAccount: { type: 'string', description: 'Account to debit' },
            creditAccount: { type: 'string', description: 'Account to credit' },
            amount: { type: 'number', description: 'Amount in INR' },
            narration: { type: 'string', description: 'Description/narration' },
          },
          required: ['date', 'debitAccount', 'creditAccount', 'amount', 'narration'],
        },
      },
    ];
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (call.name) {
        case 'get_transactions':
          return await this.getTransactions(call.arguments);
        case 'get_ledger':
          return await this.getLedger(call.arguments);
        case 'get_invoices':
          return await this.getInvoices(call.arguments);
        case 'get_expense_summary':
          return await this.getExpenseSummary(call.arguments);
        case 'get_bank_balances':
          return await this.getBankBalances();
        case 'get_gst_summary':
          return await this.getGSTSummary(call.arguments);
        case 'create_journal_entry':
          return await this.createJournalEntry(call.arguments);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${call.name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tally API error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async apiRequest(method: string, path: string, body?: Record<string, unknown>): Promise<any> {
    const url = `${this.baseUrl}/companies/${this.companyId}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private async getTransactions(args: Record<string, unknown>): Promise<MCPToolResult> {
    const params = new URLSearchParams();
    if (args.startDate) params.set('start_date', args.startDate as string);
    if (args.endDate) params.set('end_date', args.endDate as string);
    if (args.type && args.type !== 'all') params.set('type', args.type as string);
    params.set('limit', String(args.limit || 50));

    const data = await this.apiRequest('GET', `/transactions?${params}`);

    const transactions = (data.transactions || [])
      .map((t: any) => `${t.date} | ${t.type.toUpperCase().padEnd(8)} | ₹${t.amount.toLocaleString('en-IN')} | ${t.description} | ${t.category || 'Uncategorized'}`)
      .join('\n');

    const summary = data.summary || {};
    const text = [
      `Transactions (${data.transactions?.length || 0} results):`,
      '',
      transactions || 'No transactions found.',
      '',
      'Summary:',
      `  Income: ₹${(summary.total_income || 0).toLocaleString('en-IN')}`,
      `  Expenses: ₹${(summary.total_expenses || 0).toLocaleString('en-IN')}`,
      `  Net: ₹${(summary.net || 0).toLocaleString('en-IN')}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async getLedger(args: Record<string, unknown>): Promise<MCPToolResult> {
    const params = new URLSearchParams({ account: args.accountName as string });
    if (args.startDate) params.set('start_date', args.startDate as string);
    if (args.endDate) params.set('end_date', args.endDate as string);

    const data = await this.apiRequest('GET', `/ledger?${params}`);

    const entries = (data.entries || [])
      .map((e: any) => `${e.date} | Debit: ₹${e.debit?.toLocaleString('en-IN') || 0} | Credit: ₹${e.credit?.toLocaleString('en-IN') || 0} | ${e.narration}`)
      .join('\n');

    return {
      content: [{ type: 'text', text: `Ledger: ${args.accountName}\n\n${entries || 'No entries found.'}\n\nBalance: ₹${(data.balance || 0).toLocaleString('en-IN')}` }],
    };
  }

  private async getInvoices(args: Record<string, unknown>): Promise<MCPToolResult> {
    const params = new URLSearchParams({ limit: String(args.limit || 20) });
    if (args.status && args.status !== 'all') params.set('status', args.status as string);

    const data = await this.apiRequest('GET', `/invoices?${params}`);

    const invoices = (data.invoices || [])
      .map((inv: any) => `${inv.number} | ${inv.date} | ₹${inv.amount.toLocaleString('en-IN')} | ${inv.status} | ${inv.party}`)
      .join('\n');

    const summary = data.summary || {};
    const text = [
      'Invoices:',
      invoices || 'No invoices found.',
      '',
      'Summary:',
      `  Total Invoiced: ₹${(summary.total || 0).toLocaleString('en-IN')}`,
      `  Collected: ₹${(summary.collected || 0).toLocaleString('en-IN')}`,
      `  Outstanding: ₹${(summary.outstanding || 0).toLocaleString('en-IN')}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async getExpenseSummary(args: Record<string, unknown>): Promise<MCPToolResult> {
    const params = new URLSearchParams();
    if (args.startDate) params.set('start_date', args.startDate as string);
    if (args.endDate) params.set('end_date', args.endDate as string);

    const data = await this.apiRequest('GET', `/expenses/summary?${params}`);

    const categories = (data.categories || [])
      .map((c: any) => `  ${c.name}: ₹${c.amount.toLocaleString('en-IN')} (${c.percentage || 0}%)`)
      .join('\n');

    const text = [
      `Expense Summary (${args.startDate || 'all time'} to ${args.endDate || 'now'}):`,
      '',
      categories || 'No expenses found.',
      '',
      `Total: ₹${(data.total || 0).toLocaleString('en-IN')}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async getBankBalances(): Promise<MCPToolResult> {
    const data = await this.apiRequest('GET', '/bank-accounts');

    const accounts = (data.accounts || [])
      .map((a: any) => `  ${a.name}: ₹${a.balance.toLocaleString('en-IN')} (${a.bank})`)
      .join('\n');

    const total = (data.accounts || []).reduce((sum: number, a: any) => sum + (a.balance || 0), 0);

    const text = [
      'Bank Accounts:',
      accounts || 'No accounts found.',
      '',
      `Total: ₹${total.toLocaleString('en-IN')}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async getGSTSummary(args: Record<string, unknown>): Promise<MCPToolResult> {
    const params = new URLSearchParams();
    if (args.startDate) params.set('start_date', args.startDate as string);
    if (args.endDate) params.set('end_date', args.endDate as string);
    params.set('period', (args.period as string) || 'monthly');

    const data = await this.apiRequest('GET', `/gst/summary?${params}`);

    const text = [
      'GST Summary:',
      '',
      `  CGST: ₹${(data.cgst || 0).toLocaleString('en-IN')}`,
      `  SGST: ₹${(data.sgst || 0).toLocaleString('en-IN')}`,
      `  IGST: ₹${(data.igst || 0).toLocaleString('en-IN')}`,
      `  Total Output Tax: ₹${(data.total_output || 0).toLocaleString('en-IN')}`,
      `  Total Input Tax Credit: ₹${(data.total_itc || 0).toLocaleString('en-IN')}`,
      `  Net Tax Payable: ₹${(data.net_payable || 0).toLocaleString('en-IN')}`,
      '',
      `  Filing Status: ${data.filing_status || 'Unknown'}`,
      `  Next Due Date: ${data.next_due_date || 'N/A'}`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async createJournalEntry(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiRequest('POST', '/journal-entries', {
      date: args.date,
      debit_account: args.debitAccount,
      credit_account: args.creditAccount,
      amount: args.amount,
      narration: args.narration,
    });

    return {
      content: [{
        type: 'text',
        text: [
          'Journal entry created successfully!',
          `  ID: ${data.entry_id}`,
          `  Date: ${args.date}`,
          `  ${args.debitAccount} (Dr) ← ${args.creditAccount} (Cr)`,
          `  Amount: ₹${(args.amount as number).toLocaleString('en-IN')}`,
          `  Narration: ${args.narration}`,
        ].join('\n'),
      }],
    };
  }
}
