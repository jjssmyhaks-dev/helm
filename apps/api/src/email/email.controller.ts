import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { EmailService } from './email.service.js';
import { EmailCategory, EmailDraftStatus } from '@prisma/client';

@ApiTags('Emails')
@ApiBearerAuth()
@UseGuards(ClerkGuard)
@Controller('emails')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post('draft')
  @ApiOperation({ summary: 'AI-draft an email with RAG-powered tonality' })
  async draftEmail(
    @Request() req: any,
    @Body() body: {
      category: EmailCategory;
      to?: string;
      subject?: string;
      keyPoints?: string[];
      tonality?: string;
      leadId?: string;
      additionalContext?: string;
    },
  ) {
    return this.emailService.draftEmail(req.user.id, body.category, body);
  }

  @Post('draft/:id/approve')
  @ApiOperation({ summary: 'Approve a draft for sending' })
  async approveDraft(@Param('id') id: string) {
    return this.emailService.approveDraft(id);
  }

  @Post('draft/:id/send')
  @ApiOperation({ summary: 'Send an approved email draft' })
  async sendEmail(@Param('id') id: string) {
    return this.emailService.sendEmail(id);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'List email drafts' })
  async getDrafts(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.emailService.getDrafts(req.user.id, status as EmailDraftStatus);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List email templates' })
  async getTemplates(
    @Request() req: any,
    @Query('category') category?: string,
  ) {
    return this.emailService.getTemplates(req.user.id, category as EmailCategory);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create an email template' })
  async createTemplate(
    @Request() req: any,
    @Body() body: {
      name: string;
      category: EmailCategory;
      subject: string;
      body: string;
      tonality: string;
      tags?: string[];
    },
  ) {
    return this.emailService.createTemplate(req.user.id, body);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete an email template' })
  async deleteTemplate(@Request() req: any, @Param('id') id: string) {
    return this.emailService.deleteTemplate(req.user.id, id);
  }

  @Get('sent')
  @ApiOperation({ summary: 'List sent emails' })
  async getSentEmails(@Request() req: any) {
    return this.emailService.getSentEmails(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email sending statistics' })
  async getStats(@Request() req: any) {
    return this.emailService.getStats(req.user.id);
  }
}
