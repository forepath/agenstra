import type { CreateContentReportDto } from '../dto/create-content-report.dto';

export function formatContentReportMessage(dto: CreateContentReportDto): string {
  if (dto.reportType === 'tco') {
    return formatTcoContentReportMessage(dto);
  }

  return formatDsaContentReportMessage(dto);
}

function formatDsaContentReportMessage(dto: CreateContentReportDto): string {
  const anonymous = Boolean(dto.csamAnonymous);
  const lines = [
    'DSA Article 16 illegal content notice from website',
    '',
    `Notifier name: ${anonymous ? 'Waived (CSAM-eligible anonymous notice)' : (dto.name ?? '').trim()}`,
    `Notifier email: ${anonymous ? 'Waived (CSAM-eligible anonymous notice)' : (dto.email ?? '').trim()}`,
    `CSAM anonymous eligible: ${anonymous ? 'yes' : 'no'}`,
    `Good-faith confirmation: ${dto.goodFaithConfirmed ? 'yes' : 'no'}`,
    `Illegal content category: ${(dto.illegalContentCategory ?? '').trim() || 'Not provided'}`,
    '',
    'Exact URL(s) / electronic location:',
    (dto.contentUrls ?? '').trim(),
  ];

  if (dto.additionalIdentifiers?.trim()) {
    lines.push('', 'Additional identifying information:', dto.additionalIdentifiers.trim());
  }

  lines.push('', 'Explanation of alleged illegality:', (dto.explanation ?? '').trim());

  return lines.join('\n');
}

function formatTcoContentReportMessage(dto: CreateContentReportDto): string {
  return [
    'TCO-VO Article 15 removal order from website',
    '',
    `Issuing competent authority: ${(dto.authorityName ?? '').trim()}`,
    `Member State: ${(dto.memberState ?? '').trim()}`,
    `Authorized official: ${(dto.officialName ?? '').trim()} (${(dto.officialRole ?? '').trim()})`,
    `Official contact email: ${(dto.email ?? '').trim()}`,
    `Order reference: ${(dto.orderReference ?? '').trim()}`,
    `Order issued at: ${(dto.orderIssuedAt ?? '').trim()}`,
    `Preferred language: ${(dto.preferredLanguage ?? '').trim()}`,
    `Emergency case: ${dto.emergencyCase ? 'yes' : 'no'}`,
    `Authority attestation: ${dto.authorityAttestation ? 'yes' : 'no'}`,
    '',
    'Exact URL(s) of the terrorist content:',
    (dto.contentUrls ?? '').trim(),
    '',
    'Statement of reasons / legal basis:',
    (dto.statementOfReasons ?? '').trim(),
    '',
    'Redress information provided:',
    (dto.redressInformation ?? '').trim(),
    '',
    'Signed removal-order PDF: attached',
  ].join('\n');
}
