import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateEntryDto {
  name?: string;
  email?: string;
  note?: string;

  constructor(data: Partial<UpdateEntryDto> = {}) {
    Object.assign(this, data);
  }
}

IsOptional()(UpdateEntryDto.prototype, 'name');
IsString()(UpdateEntryDto.prototype, 'name');
Length(2, 80)(UpdateEntryDto.prototype, 'name');
IsOptional()(UpdateEntryDto.prototype, 'email');
IsEmail()(UpdateEntryDto.prototype, 'email');
IsOptional()(UpdateEntryDto.prototype, 'note');
IsString()(UpdateEntryDto.prototype, 'note');
Length(2, 500)(UpdateEntryDto.prototype, 'note');
