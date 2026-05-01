import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TiersService } from './tiers.service';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Tiers')
@Controller()
export class TiersController {
  constructor(private readonly tiersService: TiersService) {}

  @Get('tiers')
  @ApiOperation({ summary: 'ყველა Tier-ის სია' })
  @ApiResponse({ status: 200, description: 'Tier-ების სია წარმატებით დაბრუნდა' })
  findAll() {
    return this.tiersService.findAll();
  }

  @Post('admin/tiers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ახალი Tier-ის შექმნა' })
  @ApiResponse({ status: 201, description: 'Tier წარმატებით შეიქმნა' })
  @ApiResponse({ status: 409, description: 'ამ სახელის Tier უკვე არსებობს' })
  create(@Body() dto: CreateTierDto) {
    return this.tiersService.create(dto);
  }

  @Patch('admin/tiers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Tier-ის განახლება' })
  @ApiResponse({ status: 200, description: 'Tier წარმატებით განახლდა' })
  @ApiResponse({ status: 404, description: 'Tier ვერ მოიძებნა' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTierDto) {
    return this.tiersService.update(id, dto);
  }

  @Delete('admin/tiers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Tier-ის წაშლა' })
  @ApiResponse({ status: 204, description: 'Tier წარმატებით წაიშალა' })
  @ApiResponse({ status: 404, description: 'Tier ვერ მოიძებნა' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tiersService.remove(id);
  }

  @Post('admin/tiers/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Default Tier-ების seed' })
  @ApiResponse({ status: 201, description: 'Seed წარმატებით შესრულდა' })
  seed() {
    return this.tiersService.seed();
  }
}
