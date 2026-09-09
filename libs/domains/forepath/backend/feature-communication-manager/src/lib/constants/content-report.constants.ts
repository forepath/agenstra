export const CONTENT_REPORT_TYPES = ['dsa', 'tco'] as const;

export type ContentReportType = (typeof CONTENT_REPORT_TYPES)[number];

export const CONTENT_REPORT_LANGUAGES = ['en', 'de'] as const;

export type ContentReportLanguage = (typeof CONTENT_REPORT_LANGUAGES)[number];

export const CONTENT_REPORT_PDF_MAX_BYTES = 10 * 1024 * 1024;

export const CONTENT_REPORT_PDF_MIME = 'application/pdf';

export const CONTENT_REPORT_ANONYMOUS_CONTACT_EMAIL = 'dsa-anonymous@forepath.io';

export const CONTENT_REPORT_ANONYMOUS_CONTACT_NAME = 'Anonymous notifier (CSAM-eligible)';

export const CONTENT_REPORT_FIELD_MAX_LENGTH = {
  name: 200,
  email: 320,
  explanation: 5000,
  contentUrls: 5000,
  additionalIdentifiers: 2000,
  illegalContentCategory: 200,
  authorityName: 500,
  memberState: 100,
  officialName: 200,
  officialRole: 200,
  orderReference: 200,
  orderIssuedAt: 100,
  statementOfReasons: 5000,
  redressInformation: 5000,
} as const;
