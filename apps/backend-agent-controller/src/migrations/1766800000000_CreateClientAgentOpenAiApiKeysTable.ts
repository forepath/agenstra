import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

/**
 * Per-agent OpenAI-compatible API keys for agent-controller `/api/openai` routes.
 */
export class CreateClientAgentOpenAiApiKeysTable1766800000000 implements MigrationInterface {
  name = 'CreateClientAgentOpenAiApiKeysTable1766800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'client_agent_openai_api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'client_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'agent_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'api_key_encrypted',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'api_key_hash',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'client_agent_openai_api_keys',
      new TableUnique({
        name: 'uq_openai_client_agent',
        columnNames: ['client_id', 'agent_id'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'client_agent_openai_api_keys',
      new TableUnique({
        name: 'uq_openai_api_key_hash',
        columnNames: ['api_key_hash'],
      }),
    );

    await queryRunner.createForeignKey(
      'client_agent_openai_api_keys',
      new TableForeignKey({
        columnNames: ['client_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'clients',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'client_agent_openai_api_keys',
      new TableIndex({
        name: 'IDX_openai_keys_client_id',
        columnNames: ['client_id'],
      }),
    );
    await queryRunner.createIndex(
      'client_agent_openai_api_keys',
      new TableIndex({
        name: 'IDX_openai_keys_agent_id',
        columnNames: ['agent_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('client_agent_openai_api_keys', 'IDX_openai_keys_agent_id');
    await queryRunner.dropIndex('client_agent_openai_api_keys', 'IDX_openai_keys_client_id');
    const table = await queryRunner.getTable('client_agent_openai_api_keys');
    const fk = table?.foreignKeys.find((f) => f.columnNames.indexOf('client_id') !== -1);
    if (fk) {
      await queryRunner.dropForeignKey('client_agent_openai_api_keys', fk);
    }
    await queryRunner.dropUniqueConstraint('client_agent_openai_api_keys', 'uq_openai_api_key_hash');
    await queryRunner.dropUniqueConstraint('client_agent_openai_api_keys', 'uq_openai_client_agent');
    await queryRunner.dropTable('client_agent_openai_api_keys');
  }
}
