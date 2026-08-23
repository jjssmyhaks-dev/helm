import { BaseMCPServer, MCPTool, MCPToolCall, MCPToolResult } from './mcp-server.interface.js';

/**
 * Figma MCP Server
 * Provides access to Figma design files, components, and export capabilities.
 */
export class FigmaMCPServer extends BaseMCPServer {
  readonly name = 'figma';
  readonly displayName = 'Figma';
  readonly description = 'Design asset access, component browsing, and image export from Figma';

  private accessToken: string = '';
  private baseUrl = 'https://api.figma.com/v1';

  protected async authenticate(): Promise<void> {
    this.accessToken = this.credentials['accessToken'] || process.env.FIGMA_ACCESS_TOKEN || '';
    this.authenticated = !!this.accessToken;
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'get_file_info',
        description: 'Get metadata and structure of a Figma file.',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string', description: 'Figma file key (from URL)' },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'get_file_components',
        description: 'List all components in a Figma file.',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string', description: 'Figma file key' },
          },
          required: ['fileKey'],
        },
      },
      {
        name: 'export_images',
        description: 'Export frames or nodes as images (PNG, JPG, SVG).',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string', description: 'Figma file key' },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Node IDs to export' },
            format: { type: 'string', description: 'Export format: png, jpg, svg, pdf', default: 'png' },
            scale: { type: 'number', description: 'Export scale (1-4)', default: 2 },
          },
          required: ['fileKey', 'nodeIds'],
        },
      },
      {
        name: 'get_node_styles',
        description: 'Get color, typography, and style information for specific nodes.',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string', description: 'Figma file key' },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Node IDs' },
          },
          required: ['fileKey', 'nodeIds'],
        },
      },
      {
        name: 'search_components',
        description: 'Search for components by name across a file.',
        inputSchema: {
          type: 'object',
          properties: {
            fileKey: { type: 'string', description: 'Figma file key' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['fileKey', 'query'],
        },
      },
    ];
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (call.name) {
        case 'get_file_info':
          return await this.getFileInfo(call.arguments);
        case 'get_file_components':
          return await this.getFileComponents(call.arguments);
        case 'export_images':
          return await this.exportImages(call.arguments);
        case 'get_node_styles':
          return await this.getNodeStyles(call.arguments);
        case 'search_components':
          return await this.searchComponents(call.arguments);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${call.name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Figma API error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async apiGet(path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'X-Figma-Token': this.accessToken },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.err || error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private async getFileInfo(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(`/files/${args.fileKey}?depth=2`);

    const text = [
      `File: ${data.name}`,
      `Last Modified: ${data.lastModified}`,
      `Pages: ${Object.keys(data.document?.children || {}).length}`,
      '',
      'Structure:',
      ...(data.document?.children || []).map((page: any) =>
        `  Page: ${page.name} (${page.children?.length || 0} frames)`,
      ),
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  }

  private async getFileComponents(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(`/files/${args.fileKey}/components`);

    const components = Object.values(data.meta?.components || {})
      .map((c: any) => `${c.name} (${c.containing_frame?.name || 'N/A'})`)
      .slice(0, 20)
      .join('\n');

    return { content: [{ type: 'text', text: `Components (${Object.keys(data.meta?.components || {}).length}):\n${components}` }] };
  }

  private async exportImages(args: Record<string, unknown>): Promise<MCPToolResult> {
    const nodeIds = (args.nodeIds as string[]).join(',');
    const format = (args.format as string) || 'png';
    const scale = (args.scale as number) || 2;

    const data = await this.apiGet(
      `/images/${args.fileKey}?ids=${nodeIds}&format=${format}&scale=${scale}`,
    );

    const urls = Object.entries(data.images || {})
      .map(([id, url]) => `${id}: ${url}`)
      .join('\n');

    return { content: [{ type: 'text', text: `Exported images:\n${urls || 'No images exported.'}` }] };
  }

  private async getNodeStyles(args: Record<string, unknown>): Promise<MCPToolResult> {
    const nodeIds = (args.nodeIds as string[]).join(',');
    const data = await this.apiGet(`/files/${args.fileKey}/nodes?ids=${nodeIds}`);

    const styles = Object.entries(data.nodes || {})
      .map(([id, node]: [string, any]) => {
        const doc = node.document;
        return [
          `Node: ${doc?.name || id}`,
          `  Type: ${doc?.type}`,
          `  Fills: ${JSON.stringify(doc?.fills?.[0]?.color || {})}`,
          `  Effects: ${doc?.effects?.length || 0} effects`,
        ].join('\n');
      })
      .join('\n');

    return { content: [{ type: 'text', text: styles || 'No style data found.' }] };
  }

  private async searchComponents(args: Record<string, unknown>): Promise<MCPToolResult> {
    const data = await this.apiGet(`/files/${args.fileKey}/components`);
    const query = (args.query as string).toLowerCase();

    const matches = Object.values(data.meta?.components || {})
      .filter((c: any) => c.name.toLowerCase().includes(query))
      .map((c: any) => `${c.name} (${c.description || 'No description'})`)
      .join('\n');

    return { content: [{ type: 'text', text: matches || `No components matching "${args.query}".` }] };
  }
}
