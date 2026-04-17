import {
  ClientUsersRepository,
  ensureClientAccess,
  getUserFromRequest,
  type RequestWithUser,
  UsersRepository,
} from '@forepath/identity/backend';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApplyGeneratedBodyDto,
  CreateTicketCommentDto,
  CreateTicketDto,
  PrototypePromptResponseDto,
  StartBodyGenerationSessionDto,
  StartBodyGenerationSessionResponseDto,
  TicketActivityResponseDto,
  TicketCommentResponseDto,
  TicketResponseDto,
  UpdateTicketDto,
} from '../dto/tickets';
import { TicketActivityEntity } from '../entities/ticket-activity.entity';
import { TicketBodyGenerationSessionEntity } from '../entities/ticket-body-generation-session.entity';
import { TicketCommentEntity } from '../entities/ticket-comment.entity';
import { TicketAutomationEntity } from '../entities/ticket-automation.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { TicketActionType, TicketActorType, TicketPriority, TicketStatus } from '../entities/ticket.enums';
import { ClientsRepository } from '../repositories/clients.repository';
import { derivePatchActionType, type FieldChange } from '../utils/ticket-activity-payload.utils';
import {
  buildPrototypePrompt,
  buildPrototypePromptPreamble,
  type TicketPromptNode,
} from '../utils/tickets-prototype-prompt.utils';
import { ClientsService } from './clients.service';
import { TicketAutomationService, TICKET_APPROVAL_INVALIDATION_FIELDS } from './ticket-automation.service';
import { TICKETS_BOARD_EVENTS } from './ticket-board-realtime.constants';
import { TicketBoardRealtimeService } from './ticket-board-realtime.service';

const DEFAULT_SESSION_TTL_MS = 15 * 60 * 1000;

export interface TicketListQuery {
  clientId?: string;
  status?: TicketStatus;
  parentId?: string | null;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly ticketRepo: Repository<TicketEntity>,
    @InjectRepository(TicketCommentEntity)
    private readonly commentRepo: Repository<TicketCommentEntity>,
    @InjectRepository(TicketActivityEntity)
    private readonly activityRepo: Repository<TicketActivityEntity>,
    @InjectRepository(TicketBodyGenerationSessionEntity)
    private readonly bodySessionRepo: Repository<TicketBodyGenerationSessionEntity>,
    @InjectRepository(TicketAutomationEntity)
    private readonly ticketAutomationRepo: Repository<TicketAutomationEntity>,
    private readonly clientsRepository: ClientsRepository,
    private readonly clientUsersRepository: ClientUsersRepository,
    private readonly usersRepository: UsersRepository,
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => TicketAutomationService))
    private readonly ticketAutomationService: TicketAutomationService,
    private readonly ticketBoardRealtime: TicketBoardRealtimeService,
  ) {}

  /**
   * Publishes latest ticket + newest activity row for realtime subscribers (e.g. after automation cancel).
   */
  async emitBoardTicketAndActivity(ticketId: string, req?: RequestWithUser): Promise<void> {
    const dto = await this.findOne(ticketId, false, req);
    this.ticketBoardRealtime.emitToClient(dto.clientId, TICKETS_BOARD_EVENTS.ticketUpsert, dto);
    const rows = await this.activityRepo.find({
      where: { ticketId },
      order: { occurredAt: 'DESC' },
      take: 1,
    });
    if (rows[0]) {
      this.ticketBoardRealtime.emitToClient(
        dto.clientId,
        TICKETS_BOARD_EVENTS.ticketActivityCreated,
        await this.mapActivity(rows[0]),
      );
    }
  }

  /** Realtime ticket list/detail only (activity emitted separately). */
  async emitBoardTicketSnapshot(ticketId: string, req?: RequestWithUser): Promise<void> {
    const dto = await this.findOne(ticketId, false, req);
    this.boardEmitTicketUpsert(dto.clientId, dto);
  }

  /**
   * Internal: emit mapped ticket for board subscribers without HTTP request context
   * (e.g. autonomous orchestrator after ticket row changes).
   */
  async emitBoardTicketSnapshotInternal(ticketId: string): Promise<void> {
    const ticket = await this.loadTicketOrThrow(ticketId);
    const eligMap = await this.loadAutomationEligibleByTicketIds([ticket.id]);
    const dto = await this.mapTicket(ticket, eligMap.get(ticket.id) ?? false);
    this.boardEmitTicketUpsert(dto.clientId, dto);
  }

  private boardEmitTicketUpsert(clientId: string, dto: TicketResponseDto): void {
    this.ticketBoardRealtime.emitToClient(clientId, TICKETS_BOARD_EVENTS.ticketUpsert, dto);
  }

  private boardEmitTicketRemoved(clientId: string, id: string): void {
    this.ticketBoardRealtime.emitToClient(clientId, TICKETS_BOARD_EVENTS.ticketRemoved, { id, clientId });
  }

  private async boardEmitTicketActivityMapped(clientId: string, row: TicketActivityEntity): Promise<void> {
    this.ticketBoardRealtime.emitToClient(
      clientId,
      TICKETS_BOARD_EVENTS.ticketActivityCreated,
      await this.mapActivity(row),
    );
  }

  private boardEmitTicketComment(clientId: string, dto: TicketCommentResponseDto): void {
    this.ticketBoardRealtime.emitToClient(clientId, TICKETS_BOARD_EVENTS.ticketCommentCreated, dto);
  }

  private isApiKeyMode(): boolean {
    const authMethod = process.env.AUTHENTICATION_METHOD?.toLowerCase().trim();
    return authMethod === 'api-key' || (authMethod === undefined && !!process.env.STATIC_API_KEY);
  }

  private resolveActor(req?: RequestWithUser): { actorType: TicketActorType; actorUserId?: string } {
    const info = getUserFromRequest(req || ({} as RequestWithUser));
    if (info.isApiKeyAuth || this.isApiKeyMode()) {
      return { actorType: TicketActorType.SYSTEM };
    }
    if (info.userId) {
      return { actorType: TicketActorType.HUMAN, actorUserId: info.userId };
    }
    return { actorType: TicketActorType.SYSTEM };
  }

  private async getAccessibleClientIds(req?: RequestWithUser): Promise<string[] | null> {
    const info = getUserFromRequest(req || ({} as RequestWithUser));
    return await this.clientsService.getAccessibleClientIds(info.userId, info.userRole, info.isApiKeyAuth);
  }

  private async assertClientAccess(clientId: string, req?: RequestWithUser): Promise<void> {
    await ensureClientAccess(this.clientsRepository, this.clientUsersRepository, clientId, req);
  }

  private async loadTicketOrThrow(id: string): Promise<TicketEntity> {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  private async assertTicketReadable(id: string, req?: RequestWithUser): Promise<TicketEntity> {
    const ticket = await this.loadTicketOrThrow(id);
    await this.assertClientAccess(ticket.clientId, req);
    return ticket;
  }

  async listTickets(query: TicketListQuery, req?: RequestWithUser): Promise<TicketResponseDto[]> {
    const accessible = await this.getAccessibleClientIds(req);
    const qb = this.ticketRepo.createQueryBuilder('t');
    if (accessible !== null && accessible.length === 0) {
      return [];
    }
    if (accessible !== null) {
      qb.andWhere('t.client_id IN (:...ids)', { ids: accessible });
    }
    if (query.clientId) {
      if (accessible !== null && !accessible.includes(query.clientId)) {
        throw new ForbiddenException('You do not have access to this client');
      }
      qb.andWhere('t.client_id = :clientId', { clientId: query.clientId });
    }
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.parentId === null) {
      qb.andWhere('t.parent_id IS NULL');
    } else if (query.parentId !== undefined) {
      qb.andWhere('t.parent_id = :parentId', { parentId: query.parentId });
    }
    qb.orderBy('t.updated_at', 'DESC');
    const rows = await qb.getMany();
    const eligMap = await this.loadAutomationEligibleByTicketIds(rows.map((r) => r.id));
    return Promise.all(rows.map((row) => this.mapTicket(row, eligMap.get(row.id) ?? false)));
  }

  async findOne(id: string, includeDescendants: boolean, req?: RequestWithUser): Promise<TicketResponseDto> {
    const ticket = await this.assertTicketReadable(id, req);
    const eligMap = await this.loadAutomationEligibleByTicketIds([ticket.id]);
    const dto = await this.mapTicket(ticket, eligMap.get(ticket.id) ?? false);
    if (includeDescendants) {
      dto.children = await this.loadDescendantTree(id, req);
    }
    return dto;
  }

  private async loadDescendantTree(rootId: string, req?: RequestWithUser): Promise<TicketResponseDto[]> {
    const root = await this.loadTicketOrThrow(rootId);
    await this.assertClientAccess(root.clientId, req);
    const all = await this.ticketRepo.find({
      where: { clientId: root.clientId },
      order: { createdAt: 'ASC' },
    });
    const eligMap = await this.loadAutomationEligibleByTicketIds(all.map((t) => t.id));
    const byParent = new Map<string | null, TicketEntity[]>();
    for (const t of all) {
      const p = t.parentId ?? null;
      if (!byParent.has(p)) {
        byParent.set(p, []);
      }
      byParent.get(p)!.push(t);
    }
    const build = async (parentId: string | null): Promise<TicketResponseDto[]> => {
      const kids = byParent.get(parentId) ?? [];
      const out: TicketResponseDto[] = [];
      for (const k of kids) {
        const d = await this.mapTicket(k, eligMap.get(k.id) ?? false);
        d.children = await build(k.id);
        out.push(d);
      }
      return out;
    };
    return build(rootId);
  }

  async create(dto: CreateTicketDto, req?: RequestWithUser): Promise<TicketResponseDto> {
    const actor = this.resolveActor(req);
    const info = getUserFromRequest(req || ({} as RequestWithUser));

    let clientId = dto.clientId;
    const parentId = dto.parentId ?? null;

    if (parentId) {
      const parent = await this.loadTicketOrThrow(parentId);
      await this.assertClientAccess(parent.clientId, req);
      clientId = parent.clientId;
    } else {
      if (!clientId) {
        throw new BadRequestException('clientId is required when parentId is not set');
      }
      await this.assertClientAccess(clientId, req);
    }

    const ticket = this.ticketRepo.create({
      clientId: clientId!,
      parentId,
      title: dto.title.trim(),
      content: dto.content ?? null,
      priority: dto.priority ?? TicketPriority.MEDIUM,
      status: dto.status ?? TicketStatus.DRAFT,
      createdByUserId: info.userId ?? null,
    });

    const saved = await this.ticketRepo.manager.transaction(async (em) => {
      const tRepo = em.getRepository(TicketEntity);
      const aRepo = em.getRepository(TicketActivityEntity);
      const inserted = await tRepo.save(ticket);
      const act = aRepo.create({
        ticketId: inserted.id,
        actorType: actor.actorType,
        actorUserId: actor.actorUserId ?? null,
        actionType: TicketActionType.CREATED,
        payload: {
          title: inserted.title,
          clientId: inserted.clientId,
          parentId: inserted.parentId,
        },
      });
      await aRepo.save(act);
      return inserted;
    });

    const ticketDto = await this.mapTicket(saved);
    this.boardEmitTicketUpsert(ticketDto.clientId, ticketDto);
    const activityRows = await this.activityRepo.find({
      where: { ticketId: saved.id },
      order: { occurredAt: 'DESC' },
      take: 1,
    });
    if (activityRows[0]) {
      await this.boardEmitTicketActivityMapped(ticketDto.clientId, activityRows[0]);
    }
    return ticketDto;
  }

  async update(id: string, dto: UpdateTicketDto, req?: RequestWithUser): Promise<TicketResponseDto> {
    const actor = this.resolveActor(req);
    const ticket = await this.assertTicketReadable(id, req);
    const changes: Record<string, FieldChange> = {};

    if (dto.title !== undefined && dto.title !== ticket.title) {
      changes.title = { old: ticket.title, new: dto.title.trim() };
      ticket.title = dto.title.trim();
    }
    if (dto.content !== undefined && dto.content !== ticket.content) {
      changes.content = { old: ticket.content, new: dto.content };
      ticket.content = dto.content;
    }
    if (dto.priority !== undefined && dto.priority !== ticket.priority) {
      changes.priority = { old: ticket.priority, new: dto.priority };
      ticket.priority = dto.priority;
    }
    if (dto.status !== undefined && dto.status !== ticket.status) {
      changes.status = { old: ticket.status, new: dto.status };
      ticket.status = dto.status;
    }

    if (dto.clientId !== undefined && dto.clientId !== ticket.clientId) {
      if (ticket.parentId) {
        throw new BadRequestException('Cannot change workspace when ticket has a parent');
      }
      const childCount = await this.ticketRepo.count({ where: { parentId: id } });
      if (childCount > 0) {
        throw new BadRequestException('Cannot change workspace when ticket has subtasks');
      }
      await this.assertClientAccess(dto.clientId, req);
      await this.assertClientAccess(ticket.clientId, req);
      changes.clientId = { old: ticket.clientId, new: dto.clientId };
      ticket.clientId = dto.clientId;
    }

    if (dto.preferredChatAgentId !== undefined) {
      const newPref = dto.preferredChatAgentId;
      const oldPref = ticket.preferredChatAgentId ?? null;
      if (newPref !== oldPref) {
        changes.preferredChatAgentId = { old: oldPref, new: newPref };
        ticket.preferredChatAgentId = newPref;
      }
    }

    if (dto.parentId !== undefined) {
      const newParentId = dto.parentId;
      if (newParentId === ticket.id) {
        throw new BadRequestException('Ticket cannot be its own parent');
      }
      if (newParentId) {
        const parent = await this.loadTicketOrThrow(newParentId);
        if (parent.clientId !== ticket.clientId) {
          throw new BadRequestException('Parent must belong to the same workspace');
        }
        if (await this.wouldCreateCycle(id, newParentId)) {
          throw new BadRequestException('Invalid parent: would create a cycle');
        }
      }
      const oldP = ticket.parentId;
      if (oldP !== newParentId) {
        changes.parentId = { old: oldP, new: newParentId };
        ticket.parentId = newParentId;
      }
    }

    if (Object.keys(changes).length === 0) {
      return this.mapTicket(ticket);
    }

    const actionType = derivePatchActionType(changes);

    await this.ticketRepo.manager.transaction(async (em) => {
      const tRepo = em.getRepository(TicketEntity);
      const aRepo = em.getRepository(TicketActivityEntity);
      await tRepo.save(ticket);
      await aRepo.save(
        aRepo.create({
          ticketId: ticket.id,
          actorType: actor.actorType,
          actorUserId: actor.actorUserId ?? null,
          actionType,
          payload: { fields: changes },
        }),
      );
    });

    const changedKeys = Object.keys(changes);
    if (changedKeys.some((k) => TICKET_APPROVAL_INVALIDATION_FIELDS.has(k))) {
      await this.ticketAutomationService.invalidateAfterTicketFieldChanges(id, changedKeys, req);
    }

    const refreshed = await this.loadTicketOrThrow(id);
    const mapped = await this.mapTicket(refreshed);
    if (changes.clientId) {
      const oldCid = changes.clientId.old as string;
      this.boardEmitTicketRemoved(oldCid, id);
    }
    this.boardEmitTicketUpsert(mapped.clientId, mapped);
    const activityRows = await this.activityRepo.find({
      where: { ticketId: id },
      order: { occurredAt: 'DESC' },
      take: 1,
    });
    if (activityRows[0]) {
      await this.boardEmitTicketActivityMapped(mapped.clientId, activityRows[0]);
    }
    return mapped;
  }

  private async wouldCreateCycle(ticketId: string, newParentId: string): Promise<boolean> {
    let current: string | null | undefined = newParentId;
    const visited = new Set<string>();
    while (current) {
      if (current === ticketId) {
        return true;
      }
      if (visited.has(current)) {
        return true;
      }
      visited.add(current);
      const row = await this.ticketRepo.findOne({ where: { id: current }, select: ['parentId'] });
      current = row?.parentId ?? null;
    }
    return false;
  }

  async remove(id: string, req?: RequestWithUser): Promise<void> {
    const actor = this.resolveActor(req);
    const ticket = await this.assertTicketReadable(id, req);
    const childCount = await this.ticketRepo.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException('Cannot delete ticket with subtasks');
    }
    const clientId = ticket.clientId;
    await this.ticketRepo.manager.transaction(async (em) => {
      const aRepo = em.getRepository(TicketActivityEntity);
      const tRepo = em.getRepository(TicketEntity);
      await aRepo.save(
        aRepo.create({
          ticketId: id,
          actorType: actor.actorType,
          actorUserId: actor.actorUserId ?? null,
          actionType: TicketActionType.DELETED,
          payload: { title: ticket.title, clientId: ticket.clientId },
        }),
      );
      await tRepo.delete(id);
    });
    this.boardEmitTicketRemoved(clientId, id);
  }

  async listComments(ticketId: string, req?: RequestWithUser): Promise<TicketCommentResponseDto[]> {
    await this.assertTicketReadable(ticketId, req);
    const rows = await this.commentRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(rows.map((c) => this.mapComment(c)));
  }

  async addComment(
    ticketId: string,
    dto: CreateTicketCommentDto,
    req?: RequestWithUser,
  ): Promise<TicketCommentResponseDto> {
    const actor = this.resolveActor(req);
    await this.assertTicketReadable(ticketId, req);
    const info = getUserFromRequest(req || ({} as RequestWithUser));

    const { comment: saved, activityRow } = await this.ticketRepo.manager.transaction(async (em) => {
      const cRepo = em.getRepository(TicketCommentEntity);
      const aRepo = em.getRepository(TicketActivityEntity);
      const comment = await cRepo.save(
        cRepo.create({
          ticketId,
          body: dto.body.trim(),
          authorUserId: info.userId ?? null,
        }),
      );
      const activityRow = await aRepo.save(
        aRepo.create({
          ticketId,
          actorType: actor.actorType,
          actorUserId: actor.actorUserId ?? null,
          actionType: TicketActionType.COMMENT_ADDED,
          payload: { commentId: comment.id },
        }),
      );
      return { comment, activityRow };
    });

    const ticketRow = await this.loadTicketOrThrow(ticketId);
    const mappedComment = await this.mapComment(saved);
    this.boardEmitTicketComment(ticketRow.clientId, mappedComment);
    await this.boardEmitTicketActivityMapped(ticketRow.clientId, activityRow);
    return mappedComment;
  }

  async listActivity(
    ticketId: string,
    limit: number,
    offset: number,
    req?: RequestWithUser,
  ): Promise<TicketActivityResponseDto[]> {
    await this.assertTicketReadable(ticketId, req);
    const rows = await this.activityRepo.find({
      where: { ticketId },
      order: { occurredAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return Promise.all(rows.map((a) => this.mapActivity(a)));
  }

  async getPrototypePrompt(ticketId: string, req?: RequestWithUser): Promise<PrototypePromptResponseDto> {
    const ticket = await this.assertTicketReadable(ticketId, req);
    const parentChain = await this.loadParentChainEntities(ticket);
    const tree = await this.buildPromptNode(ticket);
    let body = buildPrototypePromptPreamble();
    if (parentChain.length > 0) {
      body += "Parent tickets (root → this ticket's parent):\n";
      for (const p of parentChain) {
        const shallow: TicketPromptNode = {
          id: p.id,
          title: p.title,
          content: p.content,
          priority: p.priority,
          status: p.status,
          children: [],
        };
        body += `${buildPrototypePrompt(shallow)}\n`;
      }
      body += '\nThis ticket and its subtasks:\n';
    }
    body += buildPrototypePrompt(tree);
    const actor = this.resolveActor(req);
    const activityRow = await this.activityRepo.save(
      this.activityRepo.create({
        ticketId,
        actorType: actor.actorType,
        actorUserId: actor.actorUserId ?? null,
        actionType: TicketActionType.PROTOTYPE_PROMPT_GENERATED,
        payload: { rootTicketId: ticketId },
      }),
    );
    await this.boardEmitTicketActivityMapped(ticket.clientId, activityRow);
    return { prompt: body };
  }

  /** Root-first chain of parents (excludes `ticket` itself). */
  private async loadParentChainEntities(ticket: TicketEntity): Promise<TicketEntity[]> {
    const ascending: TicketEntity[] = [];
    let parentId: string | null | undefined = ticket.parentId;
    while (parentId) {
      const p = await this.loadTicketOrThrow(parentId);
      ascending.push(p);
      parentId = p.parentId ?? null;
    }
    ascending.reverse();
    return ascending;
  }

  private async buildPromptNode(ticket: TicketEntity): Promise<TicketPromptNode> {
    const childrenRows = await this.ticketRepo.find({
      where: { parentId: ticket.id },
      order: { createdAt: 'ASC' },
    });
    const children: TicketPromptNode[] = [];
    for (const c of childrenRows) {
      children.push(await this.buildPromptNode(c));
    }
    return {
      id: ticket.id,
      title: ticket.title,
      content: ticket.content,
      priority: ticket.priority,
      status: ticket.status,
      children,
    };
  }

  async startBodyGenerationSession(
    ticketId: string,
    dto: StartBodyGenerationSessionDto,
    req?: RequestWithUser,
  ): Promise<StartBodyGenerationSessionResponseDto> {
    const actor = this.resolveActor(req);
    await this.assertTicketReadable(ticketId, req);
    const info = getUserFromRequest(req || ({} as RequestWithUser));
    const ttl = parseInt(process.env.TICKET_BODY_SESSION_TTL_MS || String(DEFAULT_SESSION_TTL_MS), 10);
    const expiresAt = new Date(Date.now() + ttl);

    const { session, activityDto } = await this.ticketRepo.manager.transaction(async (em) => {
      const sRepo = em.getRepository(TicketBodyGenerationSessionEntity);
      const aRepo = em.getRepository(TicketActivityEntity);
      const s = await sRepo.save(
        sRepo.create({
          ticketId,
          userId: info.userId ?? null,
          agentId: dto.agentId ?? null,
          expiresAt,
        }),
      );
      const activityRow = await aRepo.save(
        aRepo.create({
          ticketId,
          actorType: actor.actorType,
          actorUserId: actor.actorUserId ?? null,
          actionType: TicketActionType.BODY_GENERATION_STARTED,
          payload: { generationId: s.id, agentId: dto.agentId ?? null },
        }),
      );
      const mapped = await this.mapActivity(activityRow);
      return { session: s, activityDto: mapped };
    });

    const ticketRow = await this.loadTicketOrThrow(ticketId);
    this.ticketBoardRealtime.emitToClient(ticketRow.clientId, TICKETS_BOARD_EVENTS.ticketActivityCreated, activityDto);

    return {
      generationId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      activity: activityDto,
    };
  }

  async applyGeneratedBody(
    ticketId: string,
    dto: ApplyGeneratedBodyDto,
    req?: RequestWithUser,
  ): Promise<TicketResponseDto> {
    const info = getUserFromRequest(req || ({} as RequestWithUser));
    await this.assertTicketReadable(ticketId, req);

    const session = await this.bodySessionRepo.findOne({ where: { id: dto.generationId } });
    if (!session || session.ticketId !== ticketId) {
      throw new BadRequestException('Invalid or expired generation session');
    }
    if (session.consumedAt) {
      throw new BadRequestException('Generation session already used');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Generation session expired');
    }
    if (!info.isApiKeyAuth && !this.isApiKeyMode() && session.userId && info.userId !== session.userId) {
      throw new ForbiddenException('Generation session belongs to another user');
    }

    const ticket = await this.loadTicketOrThrow(ticketId);
    const oldContent = ticket.content;
    ticket.content = dto.content;

    await this.ticketRepo.manager.transaction(async (em) => {
      const tRepo = em.getRepository(TicketEntity);
      const aRepo = em.getRepository(TicketActivityEntity);
      const sRepo = em.getRepository(TicketBodyGenerationSessionEntity);
      await tRepo.save(ticket);
      session.consumedAt = new Date();
      await sRepo.save(session);
      return await aRepo.save(
        aRepo.create({
          ticketId,
          actorType: TicketActorType.AI,
          actorUserId: null,
          actionType: TicketActionType.CONTENT_APPLIED_FROM_AI,
          payload: {
            generationId: dto.generationId,
            agentId: session.agentId,
            previousLength: oldContent?.length ?? 0,
            newLength: dto.content.length,
          },
        }),
      );
    });

    const refreshed = await this.loadTicketOrThrow(ticketId);
    const mappedTicket = await this.mapTicket(refreshed);
    this.boardEmitTicketUpsert(mappedTicket.clientId, mappedTicket);
    const activityRows = await this.activityRepo.find({
      where: { ticketId },
      order: { occurredAt: 'DESC' },
      take: 1,
    });
    if (activityRows[0]) {
      await this.boardEmitTicketActivityMapped(mappedTicket.clientId, activityRows[0]);
    }
    return mappedTicket;
  }

  private async loadAutomationEligibleByTicketIds(ticketIds: string[]): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    if (ticketIds.length === 0) {
      return map;
    }
    const rows = await this.ticketAutomationRepo.find({
      where: { ticketId: In(ticketIds) },
      select: ['ticketId', 'eligible'],
    });
    for (const r of rows) {
      map.set(r.ticketId, r.eligible);
    }
    return map;
  }

  private async mapTicket(row: TicketEntity, automationEligible?: boolean): Promise<TicketResponseDto> {
    let createdByEmail: string | null = null;
    if (row.createdByUserId) {
      const u = await this.usersRepository.findById(row.createdByUserId);
      createdByEmail = u?.email ?? null;
    }
    let eligible = false;
    if (automationEligible !== undefined) {
      eligible = automationEligible;
    } else {
      const autoRow = await this.ticketAutomationRepo.findOne({
        where: { ticketId: row.id },
        select: ['eligible'],
      });
      eligible = autoRow?.eligible ?? false;
    }
    return {
      id: row.id,
      clientId: row.clientId,
      parentId: row.parentId,
      title: row.title,
      content: row.content,
      priority: row.priority,
      status: row.status,
      createdByUserId: row.createdByUserId,
      createdByEmail,
      preferredChatAgentId: row.preferredChatAgentId ?? null,
      automationEligible: eligible,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async mapComment(row: TicketCommentEntity): Promise<TicketCommentResponseDto> {
    let authorEmail: string | null = null;
    if (row.authorUserId) {
      const u = await this.usersRepository.findById(row.authorUserId);
      authorEmail = u?.email ?? null;
    }
    return {
      id: row.id,
      ticketId: row.ticketId,
      authorUserId: row.authorUserId,
      authorEmail,
      body: row.body,
      createdAt: row.createdAt,
    };
  }

  private async mapActivity(row: TicketActivityEntity): Promise<TicketActivityResponseDto> {
    let actorEmail: string | null = null;
    if (row.actorUserId) {
      const u = await this.usersRepository.findById(row.actorUserId);
      actorEmail = u?.email ?? null;
    }
    return {
      id: row.id,
      ticketId: row.ticketId,
      occurredAt: row.occurredAt,
      actorType: row.actorType,
      actorUserId: row.actorUserId,
      actorEmail,
      actionType: row.actionType,
      payload: row.payload,
    };
  }
}
