import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlayerDetails1000000000006 implements MigrationInterface {
  name = 'AddPlayerDetails1000000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "number" SMALLINT NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "age" SMALLINT NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "birthDate" DATE NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "birthPlace" VARCHAR NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "nationality" VARCHAR NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "height" VARCHAR NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "weight" VARCHAR NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "injured" BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "rating" DECIMAL(4,2) NULL`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "lastSyncAt" TIMESTAMP NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "lastSyncAt"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "rating"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "injured"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "weight"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "height"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "nationality"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "birthPlace"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "birthDate"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "age"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "number"`);
  }
}
