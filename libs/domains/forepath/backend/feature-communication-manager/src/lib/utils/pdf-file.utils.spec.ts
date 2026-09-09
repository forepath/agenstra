import { assertValidPdfFile, mapPdfValidationError } from './pdf-file.utils';

describe('pdf-file.utils', () => {
  const validPdf = {
    originalname: 'order.pdf',
    mimetype: 'application/pdf',
    size: 12,
    buffer: Buffer.from('%PDF-1.4 rest'),
  };

  it('accepts a valid PDF', () => {
    expect(() => assertValidPdfFile(validPdf)).not.toThrow();
  });

  it('rejects missing files', () => {
    expect(() => assertValidPdfFile(undefined)).toThrow('PDF_REQUIRED');
  });

  it('rejects non-pdf extensions', () => {
    expect(() => assertValidPdfFile({ ...validPdf, originalname: 'order.txt' })).toThrow('PDF_EXTENSION');
  });

  it('rejects wrong mime types', () => {
    expect(() => assertValidPdfFile({ ...validPdf, mimetype: 'text/plain' })).toThrow('PDF_MIME');
  });

  it('rejects files without PDF magic bytes', () => {
    expect(() => assertValidPdfFile({ ...validPdf, buffer: Buffer.from('not-a-pdf') })).toThrow('PDF_MAGIC');
  });

  it('maps validation codes to messages', () => {
    expect(mapPdfValidationError('PDF_REQUIRED')).toContain('required');
    expect(mapPdfValidationError('PDF_NOT_ALLOWED')).toContain('only allowed');
  });
});
