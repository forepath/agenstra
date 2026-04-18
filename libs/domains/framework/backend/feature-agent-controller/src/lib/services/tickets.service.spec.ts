import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientUsersRepository, UsersRepository } from '@forepath/identity/backend';
import { TicketActivityEntity } from '../entities/ticket-activity.entity';
import { TicketBodyGenerationSessionEntity } from '../entities/ticket-body-generation-session.entity';
import { TicketCommentEntity } from '../entities/ticket-comment.entity';
import { TicketAutomationEntity } from '../entities/ticket-automation.entity';
import { TicketEntity } from '../entities/ticket.entity';
import { TicketPriority, TicketStatus } from '../entities/ticket.enums';
import { ClientsRepository } from '../repositories/clients.repository';
import { ClientsService } from './clients.service';
import { TicketAutomationService } from './ticket-automation.service';
import { ClientAutomationChatRealtimeService } from './client-automation-chat-realtime.service';
import { TicketBoardRealtimeService } from './ticket-board-realtime.service';
import { TicketsService } from './tickets.service';

jest.mock('@forepath/identity/backend', () => {
  const actual = jest.requireActual('@forepath/identity/backend');
  return {
    ...actual,
    ensureClientAccess: jest.fn().mockResolvedValue(undefined),
    getUserFromRequest: jest.fn().mockReturnValue({ userId: 'user-1', userRole: 'admin', isApiKeyAuth: false }),
  };
});

describe('TicketsService', () => {
  let service: TicketsService;

  const ticketId = '00000000-0000-4000-8000-000000000001';
  const clientId = '00000000-0000-4000-8000-0000000000c1';
  const agentA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const agentB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  let ticket: TicketEntity;

  const commentRepo = {};
  const bodySessionRepo = {};

  const activityRepo = {
    save: jest.fn(),
    create: jest.fn((x: unknown) => x),
    find: jest.fn().mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-00000000a099',
        ticketId,
        occurredAt: new Date('2024-01-02T00:00:00.000Z'),
        actorType: 'human',
        actorUserId: 'user-1',
        actionType: 'FIELD_UPDATED',
        payload: {},
      },
    ]),
  };

  const ticketRepo = {
    findOne: jest.fn(),
    count: jest.fn(),
    manager: {
      transaction: jest.fn(async (fn: (em: unknown) => Promise<void>) => {
        const em = {
          getRepository: (entity: unknown) => {
            if (entity === TicketEntity) {
              return { save: jest.fn().mockResolvedValue(undefined) };
            }
            if (entity === TicketActivityEntity) {
              return activityRepo;
            }
            throw new Error(`Unexpected repository for ${String(entity)}`);
          },
        };
        await fn(em);
      }),
    },
  };

  const ticketAutomationService = {
    invalidateAfterTicketFieldChanges: jest.fn().mockResolvedValue(undefined),
  };

  const ticketAutomationRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  };

  const usersRepository = {
    findById: jest.fn().mockResolvedValue(null),
  };

  const clientsService = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    ticket = {
      id: ticketId,
      clientId,
      parentId: null,
      title: 'Example',
      content: null,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.DRAFT,
      createdByUserId: null,
      preferredChatAgentId: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    } as unknown as TicketEntity;
    ticketRepo.findOne.mockResolvedValue(ticket);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(TicketEntity), useValue: ticketRepo },
        { provide: getRepositoryToken(TicketCommentEntity), useValue: commentRepo },
        { provide: getRepositoryToken(TicketActivityEntity), useValue: activityRepo },
        { provide: getRepositoryToken(TicketBodyGenerationSessionEntity), useValue: bodySessionRepo },
        { provide: getRepositoryToken(TicketAutomationEntity), useValue: ticketAutomationRepo },
        { provide: ClientsRepository, useValue: {} },
        { provide: ClientUsersRepository, useValue: {} },
        { provide: UsersRepository, useValue: usersRepository },
        { provide: ClientsService, useValue: clientsService },
        { provide: TicketAutomationService, useValue: ticketAutomationService },
        { provide: TicketBoardRealtimeService, useValue: { emitToClient: jest.fn() } },
        { provide: ClientAutomationChatRealtimeService, useValue: { emitTicketChatUpsert: jest.fn() } },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  describe('update preferredChatAgentId', () => {
    it('persists and returns preferredChatAgentId', async () => {
      const dto = await service.update(ticketId, { preferredChatAgentId: agentA }, undefined);
      expect(dto.preferredChatAgentId).toBe(agentA);
      expect(ticket.preferredChatAgentId).toBe(agentA);
      expect(ticketRepo.manager.transaction).toHaveBeenCalled();
      expect(activityRepo.save).toHaveBeenCalled();
    });

    it('clears preferredChatAgentId when set to null', async () => {
      ticket.preferredChatAgentId = agentA;
      const dto = await service.update(ticketId, { preferredChatAgentId: null }, undefined);
      expect(dto.preferredChatAgentId).toBeNull();
      expect(ticket.preferredChatAgentId).toBeNull();
    });

    it('skips transaction when value unchanged', async () => {
      ticket.preferredChatAgentId = agentB;
      const dto = await service.update(ticketId, { preferredChatAgentId: agentB }, undefined);
      expect(dto.preferredChatAgentId).toBe(agentB);
      expect(ticketRepo.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('automationEligible on ticket response', () => {
    it('returns false when no ticket_automation row exists', async () => {
      const dto = await service.update(ticketId, { preferredChatAgentId: agentB }, undefined);
      expect(dto.automationEligible).toBe(false);
      expect(ticketAutomationRepo.findOne).toHaveBeenCalled();
    });

    it('returns eligible from ticket_automation when present', async () => {
      ticketAutomationRepo.findOne.mockResolvedValueOnce({ eligible: true });
      const dto = await service.update(ticketId, { preferredChatAgentId: agentB }, undefined);
      expect(dto.automationEligible).toBe(true);
    });
  });
});
