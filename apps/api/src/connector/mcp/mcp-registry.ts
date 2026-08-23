import { MCPServer, MCPTool, MCPToolCall, MCPToolResult } from './mcp-server.interface.js';
import { WebSearchMCPServer } from './web-search.server.js';
import { MetaAdsMCPServer } from './meta-ads.server.js';
import { FigmaMCPServer } from './figma.server.js';
import { WhatsAppMCPServer } from './whatsapp.server.js';
import { TallyMCPServer } from './tally.server.js';

/**
 * Central registry for all MCP server implementations.
 * Agents never call third-party APIs directly — they go through this registry.
 */
export class MCPServerRegistry {
  private servers = new Map<string, MCPServer>();

  constructor() {
    // Register all built-in MCP servers
    this.register(new WebSearchMCPServer('mcp://web-search'));
    this.register(new MetaAdsMCPServer('mcp://meta-ads'));
    this.register(new FigmaMCPServer('mcp://figma'));
    this.register(new WhatsAppMCPServer('mcp://whatsapp'));
    this.register(new TallyMCPServer('mcp://tally'));
  }

  register(server: MCPServer): void {
    this.servers.set(server.name, server);
  }

  get(name: string): MCPServer | undefined {
    return this.servers.get(name);
  }

  getAll(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Initialize a specific server with credentials.
   */
  async initialize(name: string, credentials?: Record<string, string>): Promise<void> {
    const server = this.servers.get(name);
    if (!server) throw new Error(`MCP server "${name}" not found`);
    await server.initialize(credentials);
  }

  /**
   * Initialize all servers.
   */
  async initializeAll(credentialMap: Record<string, Record<string, string>> = {}): Promise<void> {
    const promises = Array.from(this.servers.entries()).map(async ([name, server]) => {
      const credentials = credentialMap[name];
      if (credentials) {
        await server.initialize(credentials);
      }
    });
    await Promise.allSettled(promises);
  }

  /**
   * List all tools across all initialized servers.
   */
  async listAllTools(): Promise<Array<{ server: string; tool: MCPTool }>> {
    const allTools: Array<{ server: string; tool: MCPTool }> = [];

    for (const server of this.servers.values()) {
      try {
        const tools = await server.listTools();
        for (const tool of tools) {
          allTools.push({ server: server.name, tool });
        }
      } catch (err) {
        // Skip servers that can't list tools
      }
    }

    return allTools;
  }

  /**
   * Call a tool on a specific server.
   */
  async callTool(serverName: string, call: MCPToolCall): Promise<MCPToolResult> {
    const server = this.servers.get(serverName);
    if (!server) {
      return { content: [{ type: 'text', text: `MCP server "${serverName}" not found` }], isError: true };
    }
    return server.callTool(call);
  }

  /**
   * Health check all servers.
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, server] of this.servers) {
      try {
        results[name] = await server.healthCheck();
      } catch {
        results[name] = false;
      }
    }
    return results;
  }
}

// Singleton instance
let registry: MCPServerRegistry | null = null;

export function getMCPRegistry(): MCPServerRegistry {
  if (!registry) {
    registry = new MCPServerRegistry();
  }
  return registry;
}
