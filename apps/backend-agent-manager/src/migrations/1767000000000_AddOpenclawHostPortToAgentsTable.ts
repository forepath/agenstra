import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add openclaw_host_port column to agents table.
 * This column stores the host port for the OpenClaw gateway when the agent type is AGI.
 * Used for proxying WebSocket and HTTP traffic to the OpenClaw Control UI.
 */
export class AddOpenclawHostPortToAgentsTable1767000000000 implements MigrationInterface {
  name = 'AddOpenclawHostPortToAgentsTable1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'agents',
      new TableColumn({
        name: 'openclaw_host_port',
        type: 'integer',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('agents', 'openclaw_host_port');
  }
}
