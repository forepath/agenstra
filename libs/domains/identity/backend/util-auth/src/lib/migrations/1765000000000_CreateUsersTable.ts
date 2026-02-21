import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

/**
 * Migration to create the users table.
 * Stores user accounts for the "users" authentication method.
 * Passwords are stored as bcrypt hashes (industry standard).
 */
export class CreateUsersTable1765000000000 implements MigrationInterface {
  name = 'CreateUsersTable1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'bcrypt hash; null for Keycloak-linked users',
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            isNullable: false,
            default: "'user'",
          },
          {
            name: 'email_confirmed_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'null = not confirmed; required for login (except first user)',
          },
          {
            name: 'email_confirmation_token',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'bcrypt hash of token (not plain text)',
          },
          {
            name: 'password_reset_token',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'bcrypt hash of token (not plain text)',
          },
          {
            name: 'password_reset_token_expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'keycloak_sub',
            type: 'varchar',
            length: '255',
            isNullable: true,
            comment: 'Keycloak subject ID for Keycloak-linked users',
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
      'users',
      new TableUnique({
        name: 'uq_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createUniqueConstraint(
      'users',
      new TableUnique({
        name: 'uq_users_keycloak_sub',
        columnNames: ['keycloak_sub'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_keycloak_sub',
        columnNames: ['keycloak_sub'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_keycloak_sub');
    await queryRunner.dropIndex('users', 'IDX_users_email');
    await queryRunner.dropUniqueConstraint('users', 'uq_users_keycloak_sub');
    await queryRunner.dropUniqueConstraint('users', 'uq_users_email');
    await queryRunner.dropTable('users');
  }
}
