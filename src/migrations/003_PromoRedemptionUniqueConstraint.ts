import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromoRedemptionUniqueConstraint1000000000003 implements MigrationInterface {
  name = 'PromoRedemptionUniqueConstraint1000000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_redemption_user_promo'
        ) THEN
          ALTER TABLE "promo_redemptions"
            ADD CONSTRAINT "UQ_redemption_user_promo" UNIQUE ("userId", "promoCodeId");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promo_redemptions"
        DROP CONSTRAINT IF EXISTS "UQ_redemption_user_promo"
    `);
  }
}
