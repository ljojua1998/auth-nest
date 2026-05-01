import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'ჩემი Coin მოძრაობის ისტორია' })
  @ApiResponse({ status: 200, description: 'Transaction ისტორია' })
  getMyHistory(@Request() req: { user: { id: number } }) {
    return this.transactionsService.getMyHistory(req.user.id);
  }
}
