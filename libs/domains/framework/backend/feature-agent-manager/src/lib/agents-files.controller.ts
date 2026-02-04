import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Resource, Roles } from 'nest-keycloak-connect';
import { CreateFileDto } from './dto/create-file.dto';
import { FileContentDto } from './dto/file-content.dto';
import { FileNodeDto } from './dto/file-node.dto';
import { MoveFileDto } from './dto/move-file.dto';
import { WriteFileDto } from './dto/write-file.dto';
import { UserRole } from './entities/user.entity';
import { AgentFileSystemService } from './services/agent-file-system.service';

/**
 * Controller for agent file system operations.
 * Provides endpoints for reading, writing, listing, creating, deleting, and moving files in agent containers.
 */
@Resource('agents')
@Roles(UserRole.CONTROLLER)
@Controller('agents/:agentId/files')
export class AgentsFilesController {
  constructor(private readonly agentFileSystemService: AgentFileSystemService) {}

  /**
   * Read file content from agent container.
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   * @returns File content and encoding
   */
  @Get('*path')
  async readFile(
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
  ): Promise<FileContentDto> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, try to extract a meaningful path or use default
      normalizedPath = '.';
    } else {
      normalizedPath = '.';
    }
    return await this.agentFileSystemService.readFile(agentId, normalizedPath);
  }

  /**
   * Write file content to agent container.
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   * @param writeFileDto - The file content to write (base64-encoded)
   */
  @Put('*path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async writeFile(
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
    @Body() writeFileDto: WriteFileDto,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    await this.agentFileSystemService.writeFile(agentId, normalizedPath, writeFileDto.content, writeFileDto.encoding);
  }

  /**
   * List directory contents in agent container.
   * @param agentId - The UUID of the agent
   * @param path - Optional directory path (defaults to '.')
   * @returns Array of file nodes
   */
  @Get()
  async listDirectory(
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Query('path') path?: string,
  ): Promise<FileNodeDto[]> {
    return await this.agentFileSystemService.listDirectory(agentId, path || '.');
  }

  /**
   * Create a file or directory in agent container.
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   * @param createFileDto - The file/directory creation data
   */
  @Post('*path')
  @HttpCode(HttpStatus.CREATED)
  async createFileOrDirectory(
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
    @Body() createFileDto: CreateFileDto,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    await this.agentFileSystemService.createFileOrDirectory(
      agentId,
      normalizedPath,
      createFileDto.type,
      createFileDto.content,
    );
  }

  /**
   * Delete a file or directory from agent container.
   * @param agentId - The UUID of the agent
   * @param path - The file path (wildcard parameter for nested paths)
   */
  @Delete('*path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFileOrDirectory(
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    await this.agentFileSystemService.deleteFileOrDirectory(agentId, normalizedPath);
  }

  /**
   * Move a file or directory in agent container.
   * @param agentId - The UUID of the agent
   * @param path - The source file path (wildcard parameter for nested paths)
   * @param moveFileDto - The move operation data (destination path)
   */
  @Patch('*path')
  @HttpCode(HttpStatus.NO_CONTENT)
  async moveFileOrDirectory(
    @Param('agentId', new ParseUUIDPipe({ version: '4' })) agentId: string,
    @Param('path') path: string | string[] | Record<string, unknown> | undefined,
    @Body() moveFileDto: MoveFileDto,
  ): Promise<void> {
    // Normalize path: wildcard parameters can be string, array, object, or undefined
    let normalizedPath: string | undefined;
    if (typeof path === 'string') {
      normalizedPath = path;
    } else if (Array.isArray(path)) {
      normalizedPath = path.join('/');
    } else if (path && typeof path === 'object') {
      // If it's an object, we can't determine the path - throw error
      throw new BadRequestException('File path must be a string or array, got object');
    }
    if (!normalizedPath) {
      throw new BadRequestException('File path is required');
    }
    if (!moveFileDto.destination) {
      throw new BadRequestException('Destination path is required');
    }
    await this.agentFileSystemService.moveFileOrDirectory(agentId, normalizedPath, moveFileDto.destination);
  }
}
