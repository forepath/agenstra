import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Web Push subscriptions. Sensitive columns (`endpoint`, `p256dh`, `auth`) are encrypted at rest
 * via TypeORM AES-256-GCM (`createAes256GcmTransformer`). `endpoint_hash` supports unique lookups.
 */
export class AddPushSubscriptions1779000000000 implements MigrationInterface {
  name = 'AddPushSubscriptions1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "endpoint_hash" character varying(64) NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "user_agent" character varying(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_push_subscriptions_user_endpoint_hash" UNIQUE ("user_id", "endpoint_hash"),
        CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_push_subscriptions_user_id" ON "push_subscriptions" ("user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions";`);
  }
}
