import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class SignupDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  fullname?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 128)
  password!: string;

  constructor(data: Partial<SignupDto> = {}) {
    Object.assign(this, data);
  }
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 128)
  password!: string;

  constructor(data: Partial<LoginDto> = {}) {
    Object.assign(this, data);
  }
}
