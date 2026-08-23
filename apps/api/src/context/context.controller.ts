import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ContextService } from './context.service.js';
import { IsString, IsArray, IsOptional } from 'class-validator';

class SaveContextDto {
  @IsString()
  key!: string;

  @IsString()
  value!: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

@ApiTags('Context')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('context')
export class ContextController {
  constructor(private contextService: ContextService) {}

  @Get()
  @ApiOperation({ summary: 'List all context notes for the founder' })
  async listAll(@Request() req: any) {
    return this.contextService.listAll(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save or update a context note' })
  async save(@Body() dto: SaveContextDto, @Request() req: any) {
    return this.contextService.save(req.user.id, dto.key, dto.value, dto.tags);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a context note' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.contextService.delete(req.user.id, id);
  }
}
