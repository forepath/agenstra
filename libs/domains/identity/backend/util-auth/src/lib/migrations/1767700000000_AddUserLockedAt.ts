import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserLockedAt1767700000000 implements MigrationInterface {
  name = 'AddUserLockedAt1767700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'locked_at',
        type: 'timestamp',
        isNullable: true,
        comment: 'null = unlocked; non-null = account is locked and cannot authenticate',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'locked_at');
  }
}
