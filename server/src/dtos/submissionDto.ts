import { IsArray, IsIn, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED';

export type SubmissionResponseInput = {
  questionId: string;
  response: unknown;
};

export class CreateSubmissionDto {
  @IsMongoId()
  surveyId!: string;

  @IsArray()
  @IsNotEmpty()
  responses!: SubmissionResponseInput[];

  @IsOptional()
  @IsIn(['DRAFT', 'SUBMITTED'])
  status?: SubmissionStatus;

  constructor(data: Partial<CreateSubmissionDto> = {}) {
    Object.assign(this, data);
  }
}

export class UpdateSubmissionDto {
  @IsOptional()
  @IsArray()
  @IsNotEmpty()
  responses?: SubmissionResponseInput[];

  @IsOptional()
  @IsIn(['DRAFT', 'SUBMITTED'])
  status?: SubmissionStatus;

  constructor(data: Partial<UpdateSubmissionDto> = {}) {
    Object.assign(this, data);
  }
}
