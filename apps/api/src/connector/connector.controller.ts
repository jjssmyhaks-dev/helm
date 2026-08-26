import { Controller, Get, Post, Param, Query, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { ComposioService } from './composio.service.js';
import { AgentToolConnectorService } from './agent-tool-connector.service.js';

@ApiTags('Connectors')
@UseGuards(ClerkGuard)
@Controller('connectors')
export class ConnectorController {
  constructor(
    private composioService: ComposioService,
    private toolConnector: AgentToolConnectorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all connectors and their status (via Composio)' })
  async listConnectors(@Request() req: any) {
    return this.composioService.getConnectionStatus(req.user.id);
  }

  @Get(':name/actions')
  @ApiOperation({ summary: 'List available actions for a connector' })
  async getActions(@Param('name') name: string) {
    return this.composioService.getActionsForApp(name);
  }

  @Get('tools/all')
  @ApiOperation({ summary: 'Get all available tools across all connectors' })
  async getAllTools(@Request() req: any) {
    const session = await this.composioService.getSession(req.user.id);
    return session.tools();
  }

  @Post('execute/:action')
  @ApiOperation({ summary: 'Execute a Composio tool action' })
  async executeAction(
    @Param('action') action: string,
    @Body() params: Record<string, unknown>,
    @Request() req: any,
  ) {
    try {
      return await this.composioService.executeAction(req.user.id, action, params);
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ─── Universal Tool Connection ──────────────────────────────

  @Get('tools/search')
  @ApiOperation({ summary: 'Search available tools by keyword' })
  async searchTools(@Query('q') query: string) {
    return this.toolConnector.searchTools(query || '');
  }

  @Get('tools/suggest')
  @ApiOperation({ summary: 'AI-suggest tools for a given intent' })
  async suggestTools(@Request() req: any, @Query('intent') intent: string) {
    return this.toolConnector.suggestTools(req.user.id, intent || '');
  }

  @Get('apps/status')
  @ApiOperation({ summary: 'Get all app connection statuses' })
  async getAppsStatus(@Request() req: any) {
    return this.toolConnector.getAppsStatus(req.user.id);
  }

  @Get('apps')
  @ApiOperation({ summary: 'Get all available Composio apps' })
  async getAllApps(@Request() req: any) {
    return this.toolConnector.getAvailableTools(req.user.id);
  }
}
