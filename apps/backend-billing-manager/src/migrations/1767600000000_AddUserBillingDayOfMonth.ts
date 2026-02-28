import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserBillingDayOfMonth1767600000000 implements MigrationInterface {
  name = 'AddUserBillingDayOfMonth1767600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'billing_day_of_month',
        type: 'int',
        isNullable: true,
      }),
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_billing_day_of_month_range" ` +
        `CHECK (billing_day_of_month IS NULL OR (billing_day_of_month >= 1 AND billing_day_of_month <= 28))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "chk_users_billing_day_of_month_range"`);
    await queryRunner.dropColumn('users', 'billing_day_of_month');
  }
}
