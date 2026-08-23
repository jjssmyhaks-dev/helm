import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConnectorService } from './connector.service.js';
import { IsString, IsOptional } from 'class-validator';

class ConnectDto {
  @IsString()
  @IsOptional()
  authCode?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;
}

@ApiTags('Connectors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('connectors')
export class ConnectorController {
  constructor(private connectorService: ConnectorService) {}

  @Get()
  @ApiOperation({ summary: 'List all connectors and their status' })
  async listConnectors(@Request() req: any) {
    return this.connectorService.listConnectors(req.user.id);
  }

  @Post(':name/connect')
  @ApiOperation({ summary: 'Initiate connection for a connector' })
  async connect(
    @Param('name') name: string,
    @Body() dto: ConnectDto,
    @Request() req: any,
  ) {
    return this.connectorService.connect(req.user.id, name, dto);
  }

  @Delete(':name/disconnect')
  @ApiOperation({ summary: 'Disconnect a connector' })
  async disconnect(@Param('name') name: string, @Request() req: any) {
    return this.connectorService.disconnect(req.user.id, name);
  }

  @Get(':name/health')
  @ApiOperation({ summary: 'Check connector health status' })
  async checkHealth(@Param('name') name: string, @Request() req: any) {
    return this.connectorService.checkHealth(req.user.id, name);
  }
}
