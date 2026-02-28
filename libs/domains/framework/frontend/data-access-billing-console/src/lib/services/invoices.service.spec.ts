import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import type { CreateInvoiceDto, CreateInvoiceResponse, InvoiceResponse } from '../types/billing.types';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3200/api';
  const subscriptionId = 'sub-1';

  const mockInvoice: InvoiceResponse = {
    id: 'inv-1',
    subscriptionId: 'sub-1',
    invoiceNinjaId: 'ninja-1',
    preAuthUrl: 'https://example.com/auth',
    status: 'draft',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ENVIRONMENT,
          useValue: {
            billing: {
              restApiUrl: apiUrl,
            },
          },
        },
      ],
    });

    service = TestBed.inject(InvoicesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getInvoicesSummary', () => {
    it('should return open and overdue summary', (done) => {
      const response = { openOverdueCount: 2, openOverdueTotal: 150.5, billingDayOfMonth: 28, unbilledTotal: 42.1 };
      service.getInvoicesSummary().subscribe((res) => {
        expect(res).toEqual(response);
        done();
      });
      const req = httpMock.expectOne(`${apiUrl}/invoices/summary`);
      expect(req.request.method).toBe('GET');
      req.flush(response);
    });
  });

  describe('listInvoices', () => {
    it('should return invoices array for a subscription', (done) => {
      const mockInvoices: InvoiceResponse[] = [mockInvoice];

      service.listInvoices(subscriptionId).subscribe((invoices) => {
        expect(invoices).toEqual(mockInvoices);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/invoices/${subscriptionId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockInvoices);
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice for a subscription', (done) => {
      const dto: CreateInvoiceDto = { description: 'Test invoice' };
      const response: CreateInvoiceResponse = {
        invoiceId: 'inv-1',
        preAuthUrl: 'https://example.com/auth',
      };

      service.createInvoice(subscriptionId, dto).subscribe((res) => {
        expect(res).toEqual(response);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/invoices/${subscriptionId}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(response);
    });

    it('should send empty object when dto not provided', (done) => {
      service.createInvoice(subscriptionId).subscribe((res) => {
        expect(res).toEqual({ invoiceId: 'inv-1', preAuthUrl: 'https://example.com' });
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/invoices/${subscriptionId}`);
      expect(req.request.body).toEqual({});
      req.flush({ invoiceId: 'inv-1', preAuthUrl: 'https://example.com' });
    });
  });

  describe('refreshInvoiceLink', () => {
    it('should POST to refresh-link and return preAuthUrl', (done) => {
      const invoiceRefId = 'ref-1';
      const response = { preAuthUrl: 'https://example.com/new-link' };

      service.refreshInvoiceLink(subscriptionId, invoiceRefId).subscribe((res) => {
        expect(res).toEqual(response);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/invoices/${subscriptionId}/ref/${invoiceRefId}/refresh-link`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(response);
    });
  });
});
