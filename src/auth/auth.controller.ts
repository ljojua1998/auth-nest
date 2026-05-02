import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'რეგისტრაცია + 1,000,000 Coin' })
  @ApiResponse({ status: 201, description: 'User შეიქმნა' })
  @ApiResponse({ status: 409, description: 'Email უკვე გამოყენებულია' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login — იღებ access + refresh token-ს' })
  @ApiResponse({ status: 201, description: 'Tokens' })
  @ApiResponse({ status: 401, description: 'არასწორი credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Access token-ის განახლება refresh token-ით' })
  @ApiResponse({ status: 201, description: 'ახალი tokens' })
  @ApiResponse({ status: 401, description: 'არასწორი/ვადაგასული refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ჩემი პროფილი (JWT)' })
  @ApiResponse({ status: 200, description: 'User პროფილი + coins' })
  getProfile(@Request() req: { user: { id: number; email: string } }) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — refresh token გასუფთავება' })
  @ApiResponse({ status: 201, description: 'Logged out' })
  logout(@Request() req: { user: { id: number; email: string } }) {
    return this.authService.logout(req.user.id);
  }
}
