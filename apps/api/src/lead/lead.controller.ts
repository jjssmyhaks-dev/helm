import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { LeadService } from './lead.service.js';
import { LeadScoringService } from './lead-scoring.service.js';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('leads')
export class LeadController {
  constructor(
    private leadService: LeadService,
    private scoringService: LeadScoringService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all leads with optional filters' })
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('minScore') minScore?: string,
    @Query('maxScore') maxScore?: string,
    @Query('search') search?: string,
    @Query('source') source?: string,
  ) {
    return this.leadService.findAll(req.user.id, {
      status: status as any,
      minScore: minScore ? parseFloat(minScore) : undefined,
      maxScore: maxScore ? parseFloat(maxScore) : undefined,
      search,
      source,
    });
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  async getPipelineStats(@Request() req: any) {
    return this.leadService.getPipelineStats(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead detail with activity timeline' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.leadService.findOne(req.user.id, id);
  }

  @Get(':id/suggest')
  @ApiOperation({ summary: 'Get AI-suggested next action for a lead' })
  async suggestNextAction(@Request() req: any, @Param('id') id: string) {
    return this.leadService.suggestNextAction(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  async create(@Request() req: any, @Body() body: any) {
    return this.leadService.create(req.user.id, {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      company: body.company || null,
      title: body.title || null,
      source: body.source || null,
      linkedinUrl: body.linkedinUrl || null,
      website: body.website || null,
      tags: body.tags || [],
      notes: body.notes || null,
    } as any);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import leads' })
  async importLeads(@Request() req: any, @Body() body: { leads: any[] }) {
    return this.leadService.importLeads(req.user.id, body.leads);
  }

  @Post(':id/score')
  @ApiOperation({ summary: 'Trigger AI scoring for a lead' })
  async scoreLead(@Request() req: any, @Param('id') id: string) {
    return this.scoringService.scoreLead(id);
  }

  @Post(':id/activity')
  @ApiOperation({ summary: 'Add activity to a lead' })
  async addActivity(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { type: string; description: string; metadata?: Record<string, unknown> },
  ) {
    return this.leadService.addActivity(req.user.id, id, body.type, body.description, body.metadata);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead' })
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.leadService.update(req.user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead' })
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.leadService.delete(req.user.id, id);
  }
}
