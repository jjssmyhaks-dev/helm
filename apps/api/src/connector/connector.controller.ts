import { Controller, Get, Post, Param, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ComposioService } from './composio.service.js';

@ApiTags('Connectors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('connectors')
export class ConnectorController {
  constructor(private composioService: ComposioService) {}

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
}
