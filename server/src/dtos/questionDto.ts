import {
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Length,
  Max,
  Min
} from 'class-validator';

export type QuestionInputType = 'text' | 'number' | 'mcq' | 'date' | 'boolean' | 'rating';

export class CreateQuestionDto {
  @IsMongoId()
  surveyId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 220)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxLength?: number;

  @IsString()
  @IsIn(['text', 'number', 'mcq', 'date', 'boolean', 'rating'])
  inputType!: QuestionInputType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  constructor(data: Partial<CreateQuestionDto> = {}) {
    Object.assign(this, data);
  }
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsMongoId()
  surveyId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 220)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxLength?: number;

  @IsOptional()
  @IsString()
  @IsIn(['text', 'number', 'mcq', 'date', 'boolean', 'rating'])
  inputType?: QuestionInputType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  constructor(data: Partial<UpdateQuestionDto> = {}) {
    Object.assign(this, data);
  }
}
