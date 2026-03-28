import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, throwError } from 'rxjs';
import { TicketsService } from '../../services/tickets.service';
import {
  addTicketComment,
  addTicketCommentSuccess,
  createTicket,
  createTicketFailure,
  createTicketSuccess,
  deleteTicket,
  deleteTicketFailure,
  deleteTicketSuccess,
  loadTickets,
  loadTicketsFailure,
  loadTicketsSuccess,
  loadTicketDetailBundleSuccess,
  openTicketDetail,
  updateTicket,
  updateTicketFailure,
  updateTicketSuccess,
} from './tickets.actions';
import {
  addTicketComment$,
  createTicket$,
  deleteTicket$,
  loadTickets$,
  openTicketDetail$,
  updateTicket$,
} from './tickets.effects';
import type { TicketResponseDto } from './tickets.types';

describe('TicketsEffects', () => {
  let actions$: Actions;
  let ticketsService: jest.Mocked<TicketsService>;

  const mockTicket: TicketResponseDto = {
    id: 'ticket-1',
    clientId: 'client-1',
    title: 'T',
    priority: 'low',
    status: 'todo',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    ticketsService = {
      listTickets: jest.fn(),
      getTicket: jest.fn(),
      listComments: jest.fn(),
      listActivity: jest.fn(),
      createTicket: jest.fn(),
      updateTicket: jest.fn(),
      deleteTicket: jest.fn(),
      addComment: jest.fn(),
    } as unknown as jest.Mocked<TicketsService>;

    TestBed.configureTestingModule({
      providers: [provideMockActions(() => actions$), { provide: TicketsService, useValue: ticketsService }],
    });
    actions$ = TestBed.inject(Actions);
  });

  describe('loadTickets$', () => {
    it('should return loadTicketsSuccess on success', (done) => {
      const params = { clientId: 'client-1', parentId: null };
      const action = loadTickets({ params });
      const outcome = loadTicketsSuccess({ tickets: [mockTicket] });
      actions$ = of(action);
      ticketsService.listTickets.mockReturnValue(of([mockTicket]));
      loadTickets$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return loadTicketsFailure on error', (done) => {
      const action = loadTickets({ params: {} });
      const outcome = loadTicketsFailure({ error: 'list failed' });
      actions$ = of(action);
      ticketsService.listTickets.mockReturnValue(throwError(() => new Error('list failed')));
      loadTickets$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('openTicketDetail$', () => {
    it('should return loadTicketDetailBundleSuccess', (done) => {
      ticketsService.getTicket.mockReturnValue(of(mockTicket));
      ticketsService.listComments.mockReturnValue(of([]));
      ticketsService.listActivity.mockReturnValue(of([]));
      const action = openTicketDetail({ id: 'ticket-1' });
      const outcome = loadTicketDetailBundleSuccess({ ticket: mockTicket, comments: [], activity: [] });
      actions$ = of(action);
      openTicketDetail$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('createTicket$', () => {
    it('should return createTicketSuccess', (done) => {
      const dto = { clientId: 'client-1', title: 'New' };
      const action = createTicket({ dto });
      const outcome = createTicketSuccess({ ticket: mockTicket });
      actions$ = of(action);
      ticketsService.createTicket.mockReturnValue(of(mockTicket));
      createTicket$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return createTicketFailure on error', (done) => {
      const action = createTicket({ dto: { title: 'x' } });
      const outcome = createTicketFailure({ error: 'x' });
      actions$ = of(action);
      ticketsService.createTicket.mockReturnValue(throwError(() => new Error('x')));
      createTicket$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('updateTicket$', () => {
    it('should return updateTicketSuccess with refreshed activity', (done) => {
      const updated = { ...mockTicket, status: 'done' as const };
      const activity = [
        {
          id: 'act-1',
          ticketId: 'ticket-1',
          occurredAt: '2024-01-02T00:00:00Z',
          actorType: 'human' as const,
          actionType: 'status_changed',
          payload: {},
        },
      ];
      const action = updateTicket({ id: 'ticket-1', dto: { status: 'done' } });
      const outcome = updateTicketSuccess({ ticket: updated, activity });
      actions$ = of(action);
      ticketsService.updateTicket.mockReturnValue(of(updated));
      ticketsService.listActivity.mockReturnValue(of(activity));
      updateTicket$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(ticketsService.listActivity).toHaveBeenCalledWith('ticket-1', 100, 0);
        done();
      });
    });

    it('should return updateTicketFailure on error', (done) => {
      const action = updateTicket({ id: '1', dto: {} });
      const outcome = updateTicketFailure({ error: 'patch failed' });
      actions$ = of(action);
      ticketsService.updateTicket.mockReturnValue(throwError(() => new Error('patch failed')));
      updateTicket$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('deleteTicket$', () => {
    it('should return deleteTicketSuccess', (done) => {
      const action = deleteTicket({ id: 'ticket-1' });
      const outcome = deleteTicketSuccess({ id: 'ticket-1' });
      actions$ = of(action);
      ticketsService.deleteTicket.mockReturnValue(of(undefined));
      deleteTicket$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should return deleteTicketFailure on error', (done) => {
      const action = deleteTicket({ id: 'ticket-1' });
      const outcome = deleteTicketFailure({ error: 'gone' });
      actions$ = of(action);
      ticketsService.deleteTicket.mockReturnValue(throwError(() => new Error('gone')));
      deleteTicket$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('addTicketComment$', () => {
    it('should return addTicketCommentSuccess with refreshed activity', (done) => {
      const comment = {
        id: 'c1',
        ticketId: 'ticket-1',
        body: 'hello',
        createdAt: '2024-01-01T00:00:00Z',
      };
      const activity = [
        {
          id: 'act-1',
          ticketId: 'ticket-1',
          occurredAt: '2024-01-02T00:00:00Z',
          actorType: 'human' as const,
          actionType: 'comment_added',
          payload: {},
        },
      ];
      const action = addTicketComment({ ticketId: 'ticket-1', body: 'hello' });
      const outcome = addTicketCommentSuccess({ comment, activity });
      actions$ = of(action);
      ticketsService.addComment.mockReturnValue(of(comment));
      ticketsService.listActivity.mockReturnValue(of(activity));
      addTicketComment$(actions$, ticketsService).subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(ticketsService.listActivity).toHaveBeenCalledWith('ticket-1', 100, 0);
        done();
      });
    });
  });
});
