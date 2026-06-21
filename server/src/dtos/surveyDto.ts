import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length
} from 'class-validator';

export type SurveyStatus = 'ACTIVE' | 'INACTIVE';
export type SurveyQuestionInputType = 'text' | 'number' | 'mcq' | 'date' | 'boolean' | 'rating';
export type CreateSurveyQuestionInput = {
  title: string;
  description?: string;
  inputType: SurveyQuestionInputType;
  options?: string[];
  maxLength?: number;
  isActive?: boolean;
  isRequired?: boolean;
};

export class CreateSurveyDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 140)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 1000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  note!: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: SurveyStatus;

  @IsOptional()
  @IsArray()
  questions?: CreateSurveyQuestionInput[];

  constructor(data: Partial<CreateSurveyDto> = {}) {
    Object.assign(this, data);
  }
}

export class UpdateSurveyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 140)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 1000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  note?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: SurveyStatus;

  @IsOptional()
  @IsArray()
  questions?: CreateSurveyQuestionInput[];

  constructor(data: Partial<UpdateSurveyDto> = {}) {
    Object.assign(this, data);
  }
}
