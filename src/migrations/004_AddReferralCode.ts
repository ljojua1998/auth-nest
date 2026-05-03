import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferralCode1000000000004 implements MigrationInterface {
  name = 'AddReferralCode1000000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "transactions_type_enum" ADD VALUE IF NOT EXISTS 'referral_bonus'
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "referralCode" VARCHAR(20) UNIQUE,
        ADD COLUMN IF NOT EXISTS "referredBy" INTEGER REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referralCode"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referredBy"`);
  }
}
