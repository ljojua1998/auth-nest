import { IsInt, Min } from 'class-validator';

export class UpdateCartDto {
  @IsInt({ message: 'quantity მთელი რიცხვი უნდა იყოს' })
  @Min(1, { message: 'quantity მინიმუმ 1 უნდა იყოს' })
  quantity: number;
}
