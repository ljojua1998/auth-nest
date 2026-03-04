import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {

  @IsString()
  @IsNotEmpty({ message: 'სახელი სავალდებულოა' })
  name: string;

  @IsEmail({}, { message: 'არასწორი email ფორმატი' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' })
  password: string;
}
