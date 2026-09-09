import { Module } from '@nestjs/common';

import { PublicContactRequestsController } from './controllers/public-contact-requests.controller';
import { PublicVulnerabilityReportsController } from './controllers/public-vulnerability-reports.controller';
import { ChatwootApiService } from './services/chatwoot-api.service';
import { ContactRequestService } from './services/contact-request.service';
import { VulnerabilityReportService } from './services/vulnerability-report.service';

@Module({
  controllers: [PublicContactRequestsController, PublicVulnerabilityReportsController],
  providers: [ChatwootApiService, ContactRequestService, VulnerabilityReportService],
  exports: [ContactRequestService, VulnerabilityReportService],
})
export class CommunicationModule {}
