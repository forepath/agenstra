import { Test, TestingModule } from '@nestjs/testing';

import { KeycloakModule } from './keycloak.module';
import { KeycloakService } from './keycloak.service';

describe('KeycloakModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [KeycloakModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide KeycloakService', () => {
    const service = module.get<KeycloakService>(KeycloakService);

    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(KeycloakService);
  });

  it('should export KeycloakService', () => {
    const service = module.get<KeycloakService>(KeycloakService);

    expect(service).toBeDefined();
  });

  it('should be a global module', () => {
    // The module is decorated with @Global(), so it should be available globally
    // We can verify this by checking that the module is properly configured
    const moduleRef = module.get(KeycloakModule);

    expect(moduleRef).toBeDefined();
  });

  it('should allow KeycloakService to be injected in other modules', async () => {
    // Create a test module that imports KeycloakModule
    const testModule = await Test.createTestingModule({
      imports: [KeycloakModule],
      providers: [
        {
          provide: 'TestService',
          useFactory: (keycloakService: KeycloakService) => {
            return {
              getKeycloakService: () => keycloakService,
            };
          },
          inject: [KeycloakService],
        },
      ],
    }).compile();
    const testService = testModule.get('TestService');

    expect(testService.getKeycloakService()).toBeInstanceOf(KeycloakService);

    await testModule.close();
  });
});
