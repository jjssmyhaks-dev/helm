import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClerkGuard } from '../auth/clerk.guard.js';
import { TaskService } from './task.service.js';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}

@ApiTags('Tasks')
@UseGuards(ClerkGuard)
@Controller('tasks')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks for the founder' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'layer', required: false })
  async listTasks(
    @Request() req: any,
    @Query('status') status?: TaskStatus,
    @Query('layer') layer?: string,
  ) {
    return this.taskService.listTasks(req.user.id, status, layer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details' })
  async getTask(@Param('id') id: string, @Request() req: any) {
    return this.taskService.getTask(id, req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @Request() req: any,
  ) {
    return this.taskService.updateTaskStatus(id, req.user.id, dto.status);
  }
}
