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
  Put,
  Query,
} from '@nestjs/common';
import { KeycloakRoles, UsersRoles, UserRole } from '@forepath/identity/backend';
import { CreateServiceTypeDto } from '../dto/create-service-type.dto';
import { ServiceTypeResponseDto } from '../dto/service-type-response.dto';
import { UpdateServiceTypeDto } from '../dto/update-service-type.dto';
import { ServiceTypeEntity } from '../entities/service-type.entity';
import { ServiceTypesRepository } from '../repositories/service-types.repository';

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypesRepository: ServiceTypesRepository) {}

  @Get()
  async list(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ): Promise<ServiceTypeResponseDto[]> {
    const rows = await this.serviceTypesRepository.findAll(limit ?? 10, offset ?? 0);
    return rows.map((row) => this.mapToResponse(row));
  }

  @Get(':id')
  async get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<ServiceTypeResponseDto> {
    const row = await this.serviceTypesRepository.findByIdOrThrow(id);
    return this.mapToResponse(row);
  }

  @Post()
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  async create(@Body() dto: CreateServiceTypeDto): Promise<ServiceTypeResponseDto> {
    const row = await this.serviceTypesRepository.create({
      key: dto.key,
      name: dto.name,
      description: dto.description,
      provider: dto.provider,
      configSchema: dto.configSchema ?? {},
      isActive: dto.isActive ?? true,
    });
    return this.mapToResponse(row);
  }

  @Post(':id')
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateServiceTypeDto,
  ): Promise<ServiceTypeResponseDto> {
    const row = await this.serviceTypesRepository.update(id, {
      name: dto.name,
      description: dto.description,
      provider: dto.provider,
      configSchema: dto.configSchema,
      isActive: dto.isActive,
    });
    return this.mapToResponse(row);
  }

  @Delete(':id')
  @KeycloakRoles(UserRole.ADMIN)
  @UsersRoles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.serviceTypesRepository.delete(id);
  }

  private mapToResponse(row: ServiceTypeEntity): ServiceTypeResponseDto {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      provider: row.provider,
      configSchema: row.configSchema ?? {},
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
