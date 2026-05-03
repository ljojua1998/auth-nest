import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingIndexes1000000000005 implements MigrationInterface {
  name = 'AddMissingIndexes1000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_referralCode"
        ON "users" ("referralCode")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_referredBy"
        ON "users" ("referredBy")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_players_name"
        ON "players" ("name" varchar_pattern_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_players_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_referredBy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_referralCode"`);
  }
}
