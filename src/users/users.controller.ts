import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'ჩემი პროფილი + Coin ბალანსი' })
  @ApiResponse({ status: 200, description: 'User პროფილი' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req: { user: { id: number } }) {
    const user = await this.usersService.findByIdOrFail(req.user.id);
    const { password: _, refreshToken: __, verificationToken: ___, resetToken: ____, resetTokenExpiry: _____, ...result } = user as any;
    return { ...result, coins: Number(user.coins) };
  }

  @Patch('me')
  @ApiOperation({ summary: 'პროფილის განახლება (სახელი)' })
  @ApiResponse({ status: 200, description: 'პროფილი განახლდა' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateMe(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateProfile(req.user.id, dto);
    const { password: _, refreshToken: __, verificationToken: ___, resetToken: ____, resetTokenExpiry: _____, ...result } = user as any;
    return { ...result, coins: Number(user.coins) };
  }

  @Get('me/referral')
  @ApiOperation({ summary: 'ჩემი referral კოდი და სტატისტიკა' })
  @ApiResponse({ status: 200, description: 'Referral info' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyReferral(@Request() req: { user: { id: number } }) {
    return this.usersService.getReferralInfo(req.user.id);
  }
}
