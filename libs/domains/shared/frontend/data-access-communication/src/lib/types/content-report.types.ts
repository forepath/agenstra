import type { ContentReportLanguage, ContentReportType } from '../constants/content-report.constants';

/** Multipart payload for POST /public/content-reports. */
export interface SubmitContentReportPayload {
  reportType: ContentReportType;
  turnstileToken: string;
  contentUrls: string;
  name?: string;
  email?: string;
  explanation?: string;
  additionalIdentifiers?: string;
  illegalContentCategory?: string;
  csamAnonymous?: boolean;
  goodFaithConfirmed?: boolean;
  authorityName?: string;
  memberState?: string;
  officialName?: string;
  officialRole?: string;
  orderReference?: string;
  orderIssuedAt?: string;
  statementOfReasons?: string;
  redressInformation?: string;
  preferredLanguage?: ContentReportLanguage;
  emergencyCase?: boolean;
  authorityAttestation?: boolean;
  removalOrderPdf?: File;
}

/** Response body for POST /public/content-reports. */
export interface ContentReportResponse {
  accepted: true;
  referenceId: string;
}
