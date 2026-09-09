import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

import {
  CONTENT_REPORT_FIELD_MAX_LENGTH,
  CONTENT_REPORT_LANGUAGES,
  CONTENT_REPORT_TYPES,
  type ContentReportLanguage,
  type ContentReportType,
} from '../constants/content-report.constants';

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export class CreateContentReportDto {
  @IsString()
  @IsIn([...CONTENT_REPORT_TYPES])
  reportType!: ContentReportType;

  @IsString()
  @IsNotEmpty()
  turnstileToken!: string;

  // Shared optional identity (required for DSA unless CSAM-anonymous; required for TCO as authority email)
  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco' || !dto.csamAnonymous)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.name)
  name?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco' || !dto.csamAnonymous)
  @IsEmail()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.email)
  email?: string;

  // DSA fields
  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'dsa')
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.explanation)
  explanation?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'dsa' || dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.contentUrls)
  contentUrls?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'dsa')
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.additionalIdentifiers)
  additionalIdentifiers?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'dsa')
  @IsOptional()
  @IsString()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.illegalContentCategory)
  illegalContentCategory?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'dsa')
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  csamAnonymous?: boolean;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'dsa')
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  goodFaithConfirmed?: boolean;

  // TCO fields
  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.authorityName)
  authorityName?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.memberState)
  memberState?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.officialName)
  officialName?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.officialRole)
  officialRole?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.orderReference)
  orderReference?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.orderIssuedAt)
  orderIssuedAt?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.statementOfReasons)
  statementOfReasons?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(CONTENT_REPORT_FIELD_MAX_LENGTH.redressInformation)
  redressInformation?: string;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @IsString()
  @IsIn([...CONTENT_REPORT_LANGUAGES])
  preferredLanguage?: ContentReportLanguage;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @Transform(({ value }) => toBoolean(value))
  @IsOptional()
  @IsBoolean()
  emergencyCase?: boolean;

  @ValidateIf((dto: CreateContentReportDto) => dto.reportType === 'tco')
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  authorityAttestation?: boolean;
}
