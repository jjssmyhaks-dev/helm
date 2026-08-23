import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { IsString, IsEmail, IsOptional } from 'class-validator';

class SyncUserDto {
  @IsString()
  clerkUserId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  name?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sync Clerk user to database' })
  async syncUser(@Body() dto: SyncUserDto) {
    return this.authService.syncUser({
      id: dto.clerkUserId,
      email: dto.email,
      name: dto.name,
    });
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile by Clerk user ID' })
  async getUser(@Param('userId') userId: string) {
    const founder = await this.authService.getFounder(userId);
    if (!founder) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return founder;
  }
}
