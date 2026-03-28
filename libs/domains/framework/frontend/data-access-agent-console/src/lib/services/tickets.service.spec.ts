import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import type { TicketResponseDto } from '../state/tickets/tickets.types';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3100/api';

  const mockTicket: TicketResponseDto = {
    id: 'ticket-1',
    clientId: 'client-1',
    title: 'Example',
    priority: 'medium',
    status: 'draft',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ENVIRONMENT,
          useValue: {
            controller: { restApiUrl: apiUrl },
          },
        },
      ],
    });
    service = TestBed.inject(TicketsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listTickets', () => {
    it('should GET /tickets with clientId and parentId null', (done) => {
      service.listTickets({ clientId: 'c1', parentId: null }).subscribe((tickets) => {
        expect(tickets).toEqual([mockTicket]);
        done();
      });
      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/tickets`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('clientId')).toBe('c1');
      expect(req.request.params.get('parentId')).toBe('null');
      req.flush([mockTicket]);
    });

    it('should omit params when undefined', (done) => {
      service.listTickets().subscribe((tickets) => {
        expect(tickets).toEqual([]);
        done();
      });
      const req = httpMock.expectOne(`${apiUrl}/tickets`);
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    it('should GET all tickets for client when parentId is omitted (flat list for board tree)', (done) => {
      service.listTickets({ clientId: 'c1' }).subscribe((tickets) => {
        expect(tickets).toEqual([mockTicket]);
        done();
      });
      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/tickets`);
      expect(req.request.params.get('clientId')).toBe('c1');
      expect(req.request.params.get('parentId')).toBeNull();
      req.flush([mockTicket]);
    });
  });

  describe('createTicket', () => {
    it('should POST body to /tickets', (done) => {
      const dto = { clientId: 'c1', title: 'New', status: 'todo' as const, priority: 'high' as const };
      service.createTicket(dto).subscribe((t) => {
        expect(t).toEqual(mockTicket);
        done();
      });
      const req = httpMock.expectOne(`${apiUrl}/tickets`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockTicket);
    });
  });

  describe('updateTicket', () => {
    it('should PATCH /tickets/:id', (done) => {
      const patch = { status: 'done' as const };
      service.updateTicket('ticket-1', patch).subscribe((t) => {
        expect(t).toEqual(mockTicket);
        done();
      });
      const req = httpMock.expectOne(`${apiUrl}/tickets/ticket-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(patch);
      req.flush(mockTicket);
    });
  });
});
