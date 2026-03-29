import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { TicketPriority, TicketStatus } from '../../entities/ticket.enums';

export class UpdateTicketDto {
  @IsOptional()
  @IsUUID('4')
  clientId?: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
