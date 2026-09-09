import { Module } from '@nestjs/common';

import { PublicContactRequestsController } from './controllers/public-contact-requests.controller';
import { PublicContentReportsController } from './controllers/public-content-reports.controller';
import { PublicVulnerabilityReportsController } from './controllers/public-vulnerability-reports.controller';
import { ChatwootApiService } from './services/chatwoot-api.service';
import { ContactRequestService } from './services/contact-request.service';
import { ContentReportService } from './services/content-report.service';
import { VulnerabilityReportService } from './services/vulnerability-report.service';

@Module({
  controllers: [PublicContactRequestsController, PublicVulnerabilityReportsController, PublicContentReportsController],
  providers: [ChatwootApiService, ContactRequestService, VulnerabilityReportService, ContentReportService],
  exports: [ContactRequestService, VulnerabilityReportService, ContentReportService],
})
export class CommunicationModule {}
