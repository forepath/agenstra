import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { KeycloakRoles, UsersRoles, UserRole } from '@forepath/identity/backend';
import { CreateServicePlanDto } from '../dto/create-service-plan.dto';
import { ServicePlanResponseDto } from '../dto/service-plan-response.dto';
import { UpdateServicePlanDto } from '../dto/update-service-plan.dto';
import { ServicePlanEntity } from '../entities/service-plan.entity';
import { ServicePlansRepository } from '../repositories/service-plans.repository';

@Controller('service-plans')
export class ServicePlansController {
  constructor(private readonly servicePlansRepository: ServicePlansRepository) {}

  @Get()
  async list(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('serviceTypeId') serviceTypeId?: string,
  ): Promise<ServicePlanResponseDto[]> {
    let rows = await this.servicePlansRepository.findAll(limit ?? 10, offset ?? 0);
    if (serviceTypeId) {
      rows = rows.filter((row) => row.serviceTypeId === serviceTypeId);
    }
    return rows.map((row) => this.mapToResponse(row));
  }

  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ServicePlanResponseDto> {
    const row = await this.servicePlansRepository.findByIdOrThrow(id);
    return this.mapToResponse(row);
  }

  @Post()
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  async create(@Body() dto: CreateServicePlanDto): Promise<ServicePlanResponseDto> {
    const row = await this.servicePlansRepository.create({
      serviceTypeId: dto.serviceTypeId,
      name: dto.name,
      description: dto.description,
      billingIntervalType: dto.billingIntervalType,
      billingIntervalValue: dto.billingIntervalValue,
      billingDayOfMonth: dto.billingDayOfMonth,
      cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? true,
      minCommitmentDays: dto.minCommitmentDays ?? 0,
      noticeDays: dto.noticeDays ?? 0,
      basePrice: dto.basePrice,
      marginPercent: dto.marginPercent,
      marginFixed: dto.marginFixed,
      providerConfigDefaults: dto.providerConfigDefaults ?? {},
      isActive: dto.isActive ?? true,
    });
    return this.mapToResponse(row);
  }

  @Post(':id')
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateServicePlanDto,
  ): Promise<ServicePlanResponseDto> {
    const row = await this.servicePlansRepository.update(id, {
      name: dto.name,
      description: dto.description,
      billingIntervalType: dto.billingIntervalType,
      billingIntervalValue: dto.billingIntervalValue,
      billingDayOfMonth: dto.billingDayOfMonth,
      cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
      minCommitmentDays: dto.minCommitmentDays,
      noticeDays: dto.noticeDays,
      basePrice: dto.basePrice,
      marginPercent: dto.marginPercent,
      marginFixed: dto.marginFixed,
      providerConfigDefaults: dto.providerConfigDefaults,
      isActive: dto.isActive,
    });
    return this.mapToResponse(row);
  }

  @Delete(':id')
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.servicePlansRepository.delete(id);
  }

  private mapToResponse(row: ServicePlanEntity): ServicePlanResponseDto {
    return {
      id: row.id,
      serviceTypeId: row.serviceTypeId,
      name: row.name,
      description: row.description,
      billingIntervalType: row.billingIntervalType,
      billingIntervalValue: row.billingIntervalValue,
      billingDayOfMonth: row.billingDayOfMonth,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      minCommitmentDays: row.minCommitmentDays,
      noticeDays: row.noticeDays,
      basePrice: row.basePrice,
      marginPercent: row.marginPercent,
      marginFixed: row.marginFixed,
      providerConfigDefaults: row.providerConfigDefaults ?? {},
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
