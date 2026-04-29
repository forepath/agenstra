import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';

import {
  isWorkspaceConfigurationSettingKey,
  WORKSPACE_CONFIGURATION_ENV_BY_SETTING,
  WORKSPACE_CONFIGURATION_SETTINGS,
  WorkspaceConfigurationSettingKey,
} from '../constants/workspace-configuration-settings';
import {
  WorkspaceConfigurationSettingResponseDto,
  WorkspaceConfigurationValueSource,
} from '../dto/workspace-configuration-setting-response.dto';
import { WorkspaceConfigurationOverridesRepository } from '../repositories/workspace-configuration-overrides.repository';

@Injectable()
export class WorkspaceConfigurationOverridesService implements OnModuleInit {
  constructor(private readonly repository: WorkspaceConfigurationOverridesRepository) {}

  async onModuleInit(): Promise<void> {
    await this.applyOverridesToProcessEnv();
  }

  async getEffectiveSettings(): Promise<WorkspaceConfigurationSettingResponseDto[]> {
    const overrides = await this.repository.findAll();
    const overrideByKey = new Map(overrides.map((entry) => [entry.settingKey, entry.value]));

    return WORKSPACE_CONFIGURATION_SETTINGS.map((setting) => {
      const overrideValue = overrideByKey.get(setting.settingKey);
      const defaultValue = process.env[setting.envVarName];
      const value = overrideValue ?? defaultValue;
      let source: WorkspaceConfigurationValueSource = 'unset';

      if (overrideValue !== undefined) {
        source = 'override';
      } else if (defaultValue !== undefined) {
        source = 'default_env';
      }

      return {
        settingKey: setting.settingKey,
        envVarName: setting.envVarName,
        value,
        source,
        hasOverride: overrideValue !== undefined,
      };
    });
  }

  async upsertOverride(settingKeyRaw: string, value: string): Promise<WorkspaceConfigurationSettingResponseDto> {
    const settingKey = this.validateSettingKey(settingKeyRaw);
    const envVarName = WORKSPACE_CONFIGURATION_ENV_BY_SETTING[settingKey];

    await this.repository.upsert(settingKey, value);
    process.env[envVarName] = value;

    return {
      settingKey,
      envVarName,
      value,
      source: 'override',
      hasOverride: true,
    };
  }

  async deleteOverride(settingKeyRaw: string): Promise<void> {
    const settingKey = this.validateSettingKey(settingKeyRaw);
    const envVarName = WORKSPACE_CONFIGURATION_ENV_BY_SETTING[settingKey];

    await this.repository.deleteBySettingKey(settingKey);
    delete process.env[envVarName];
  }

  private validateSettingKey(settingKeyRaw: string): WorkspaceConfigurationSettingKey {
    if (!isWorkspaceConfigurationSettingKey(settingKeyRaw)) {
      throw new BadRequestException(`Unsupported setting key: ${settingKeyRaw}`);
    }

    return settingKeyRaw;
  }

  private async applyOverridesToProcessEnv(): Promise<void> {
    const overrides = await this.repository.findAll();

    for (const override of overrides) {
      if (!isWorkspaceConfigurationSettingKey(override.settingKey)) {
        continue;
      }

      const envVarName = WORKSPACE_CONFIGURATION_ENV_BY_SETTING[override.settingKey];

      process.env[envVarName] = override.value;
    }
  }
}
