import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// POST /orders/checkout { paymentMethod: "balance" }
export class CheckoutDto {
  // @IsIn — მხოლოდ ეს მნიშვნელობები დაიშვება
  // 'balance' — მუშა ოფცია
  // 'card' — backend-ში დაიბლოკება, მაგრამ DTO-ში ვალიდურია
  @ApiProperty({ example: 'balance', description: 'გადახდის მეთოდი', enum: ['balance', 'card'] })
  @IsIn(['balance', 'card'], {
    message: 'paymentMethod უნდა იყოს "balance" ან "card"',
  })
  paymentMethod: string;
}
