/**
 * MCP (Model Context Protocol) Server Interface
 *
 * Each connector implements this interface to provide a consistent
 * tool interface for agents regardless of the underlying API.
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPServer {
  /** Unique identifier for this MCP server */
  readonly name: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Description of what this server provides */
  readonly description: string;
  /** The MCP endpoint URL */
  readonly endpoint: string;

  /**
   * Initialize the MCP server connection.
   */
  initialize(credentials?: Record<string, string>): Promise<void>;

  /**
   * List available tools from this MCP server.
   */
  listTools(): Promise<MCPTool[]>;

  /**
   * Call a tool on this MCP server.
   */
  callTool(call: MCPToolCall): Promise<MCPToolResult>;

  /**
   * Check if the server is healthy and authenticated.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Cleanup resources.
   */
  shutdown(): Promise<void>;
}

/**
 * Base class for MCP servers with common functionality.
 */
export abstract class BaseMCPServer implements MCPServer {
  readonly abstract name: string;
  readonly abstract displayName: string;
  readonly abstract description: string;
  readonly endpoint: string;

  protected credentials: Record<string, string> = {};
  protected authenticated = false;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async initialize(credentials?: Record<string, string>): Promise<void> {
    if (credentials) {
      this.credentials = credentials;
    }
    await this.authenticate();
  }

  protected async authenticate(): Promise<void> {
    // Subclasses override to implement auth
    this.authenticated = true;
  }

  abstract listTools(): Promise<MCPTool[]>;
  abstract callTool(call: MCPToolCall): Promise<MCPToolResult>;

  async healthCheck(): Promise<boolean> {
    return this.authenticated;
  }

  async shutdown(): Promise<void> {
    this.authenticated = false;
  }
}
