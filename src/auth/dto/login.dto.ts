import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'არასწორი email ფორმატი' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' })
  password: string;
}
