import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 002 — ახალი Unique Constraints
 *
 * QA Round 2-ში ნაპოვნი BUG-H04, BUG-H07:
 * - user_team_players(userTeamId, playerId) — ერთი ფეხბ. მხოლოდ ერთხელ გუნდში
 * - user_match_scores(userId, matchId) — ერთი user-ი ერთ მატჩზე მხოლოდ ერთი score
 *
 * IF NOT EXISTS — safe to run on existing DBs that already have these constraints.
 */
export class AddUniqueConstraints1000000000002 implements MigrationInterface {
  name = 'AddUniqueConstraints1000000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* BUG-H04: user_team_players — prevent buying same player twice */
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_utp_team_player'
        ) THEN
          ALTER TABLE "user_team_players"
            ADD CONSTRAINT "UQ_utp_team_player" UNIQUE ("userTeamId", "playerId");
        END IF;
      END $$;
    `);

    /* BUG-H07: user_match_scores — prevent duplicate score records */
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_ums_user_match'
        ) THEN
          ALTER TABLE "user_match_scores"
            ADD CONSTRAINT "UQ_ums_user_match" UNIQUE ("userId", "matchId");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_match_scores"
        DROP CONSTRAINT IF EXISTS "UQ_ums_user_match"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_team_players"
        DROP CONSTRAINT IF EXISTS "UQ_utp_team_player"
    `);
  }
}
