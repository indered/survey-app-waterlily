import { IsEmail, IsString, Length } from 'class-validator';

export class CreateEntryDto {
  constructor(data = {}) {
    Object.assign(this, data);
  }
}

IsString()(CreateEntryDto.prototype, 'name');
Length(2, 80)(CreateEntryDto.prototype, 'name');
IsEmail()(CreateEntryDto.prototype, 'email');
IsString()(CreateEntryDto.prototype, 'note');
Length(2, 500)(CreateEntryDto.prototype, 'note');
