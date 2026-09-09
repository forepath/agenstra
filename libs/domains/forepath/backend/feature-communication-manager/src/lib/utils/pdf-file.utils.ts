import { CONTENT_REPORT_PDF_MAX_BYTES, CONTENT_REPORT_PDF_MIME } from '../constants/content-report.constants';

export interface UploadedPdfFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function assertValidPdfFile(file: UploadedPdfFile | undefined | null): asserts file is UploadedPdfFile {
  if (!file) {
    throw new Error('PDF_REQUIRED');
  }

  if (file.size <= 0 || file.size > CONTENT_REPORT_PDF_MAX_BYTES) {
    throw new Error('PDF_SIZE');
  }

  const normalizedName = file.originalname?.toLowerCase() ?? '';

  if (!normalizedName.endsWith('.pdf')) {
    throw new Error('PDF_EXTENSION');
  }

  if (file.mimetype !== CONTENT_REPORT_PDF_MIME) {
    throw new Error('PDF_MIME');
  }

  if (!file.buffer?.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    throw new Error('PDF_MAGIC');
  }
}

export function mapPdfValidationError(code: string): string {
  switch (code) {
    case 'PDF_REQUIRED':
      return 'A signed removal-order PDF is required for TCO reports';
    case 'PDF_SIZE':
      return 'PDF must be between 1 byte and 10 MiB';
    case 'PDF_EXTENSION':
      return 'Only .pdf files are allowed';
    case 'PDF_MIME':
      return 'Only application/pdf uploads are allowed';
    case 'PDF_MAGIC':
      return 'Uploaded file is not a valid PDF';
    case 'PDF_NOT_ALLOWED':
      return 'PDF uploads are only allowed for TCO reports';
    default:
      return 'Invalid PDF upload';
  }
}
