import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApprovalService } from './approval.service.js';
import { IsString, IsOptional, IsObject } from 'class-validator';

class ApprovalActionDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsObject()
  @IsOptional()
  editedPayload?: Record<string, unknown>;
}

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('approvals')
export class ApprovalController {
  constructor(private approvalService: ApprovalService) {}

  @Get()
  @ApiOperation({ summary: 'Get pending Tier 3 approval queue' })
  async getPending(@Request() req: any) {
    return this.approvalService.getPendingApprovals(req.user.id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending action' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @Request() req: any,
  ) {
    return this.approvalService.approve(id, req.user.id, dto.reason);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending action' })
  async reject(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @Request() req: any,
  ) {
    return this.approvalService.reject(id, req.user.id, dto.reason);
  }

  @Post(':id/edit')
  @ApiOperation({ summary: 'Edit and approve a pending action' })
  async editAndApprove(
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto,
    @Request() req: any,
  ) {
    if (!dto.editedPayload) {
      return { error: 'editedPayload is required for edit action' };
    }
    return this.approvalService.editAndApprove(
      id,
      req.user.id,
      dto.editedPayload,
      dto.reason,
    );
  }
}
