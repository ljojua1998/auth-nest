import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 001 — სრული საწყისი სქემა
 * შექმნის ყველა ცხრილს scratch-დან სწორი თანმიმდევრობით.
 *
 * IMPORTANT: თუ DB უკვე არსებობს (synchronize:true-ით შეიქმნა),
 * ეს migration skip გააკეთე:
 *   INSERT INTO migrations(timestamp, name) VALUES (1, 'InitialSchema1000000000001');
 * შემდეგ გაუშვი მხოლოდ 002_AddUniqueConstraints.
 */
export class InitialSchema1000000000001 implements MigrationInterface {
  name = 'InitialSchema1000000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /* =====================================================
       ENUM TYPES  (TypeORM naming: <table>_<column>_enum)
       ===================================================== */
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "players_position_enum" AS ENUM ('GK', 'DEF', 'MID', 'FWD')
    `);
    await queryRunner.query(`
      CREATE TYPE "transactions_type_enum" AS ENUM (
        'registration_bonus', 'player_buy', 'player_sell',
        'prize', 'promo', 'elimination_refund'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "user_team_history_action_enum" AS ENUM ('buy', 'sell', 'elimination_removed')
    `);
    await queryRunner.query(`
      CREATE TYPE "user_cards_type_enum" AS ENUM ('triple_captain', 'wildcard', 'limitless')
    `);
    await queryRunner.query(`
      CREATE TYPE "tournaments_stage_enum" AS ENUM (
        'group', 'round_of_32', 'round_of_16',
        'quarter_final', 'semi_final', 'final', 'overall'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "tournaments_status_enum" AS ENUM ('upcoming', 'active', 'completed')
    `);
    await queryRunner.query(`
      CREATE TYPE "matches_status_enum" AS ENUM ('scheduled', 'live', 'finished', 'postponed')
    `);
    await queryRunner.query(`
      CREATE TYPE "promo_codes_type_enum" AS ENUM ('campaign', 'referral', 'event')
    `);

    /* =====================================================
       TABLE: tiers  (no deps)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "tiers" (
        "id"         SERIAL        NOT NULL,
        "name"       VARCHAR       NOT NULL,
        "coinPrice"  BIGINT        NOT NULL,
        "createdAt"  TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tiers_name"   UNIQUE ("name"),
        CONSTRAINT "PK_tiers"        PRIMARY KEY ("id")
      )
    `);

    /* =====================================================
       TABLE: teams  (no deps)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id"          SERIAL        NOT NULL,
        "name"        VARCHAR       NOT NULL,
        "code"        VARCHAR(3)    NOT NULL,
        "flag"        VARCHAR       ,
        "group"       VARCHAR(1)    ,
        "eliminated"  BOOLEAN       NOT NULL DEFAULT false,
        "createdAt"   TIMESTAMP     NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_teams_name"   UNIQUE ("name"),
        CONSTRAINT "UQ_teams_code"   UNIQUE ("code"),
        CONSTRAINT "PK_teams"        PRIMARY KEY ("id")
      )
    `);

    /* =====================================================
       TABLE: users  (no deps)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                 SERIAL                  NOT NULL,
        "name"               VARCHAR                 NOT NULL,
        "email"              VARCHAR                 NOT NULL,
        "password"           VARCHAR                 NOT NULL,
        "coins"              BIGINT                  NOT NULL DEFAULT 1000000,
        "role"               "users_role_enum"       NOT NULL DEFAULT 'user',
        "isVerified"         BOOLEAN                 NOT NULL DEFAULT true,
        "verificationToken"  VARCHAR                 ,
        "resetToken"         VARCHAR                 ,
        "resetTokenExpiry"   TIMESTAMP               ,
        "refreshToken"       VARCHAR                 ,
        "createdAt"          TIMESTAMP               NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMP               NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email"  UNIQUE ("email"),
        CONSTRAINT "PK_users"        PRIMARY KEY ("id")
      )
    `);

    /* =====================================================
       TABLE: players  (deps: tiers, teams)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "players" (
        "id"             SERIAL                    NOT NULL,
        "name"           VARCHAR                   NOT NULL,
        "position"       "players_position_enum"   NOT NULL,
        "photo"          VARCHAR                   ,
        "apiFootballId"  INTEGER                   ,
        "teamId"         INTEGER                   NOT NULL,
        "tierId"         INTEGER                   NOT NULL,
        "createdAt"      TIMESTAMP                 NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_players_apiFootballId"  UNIQUE ("apiFootballId"),
        CONSTRAINT "PK_players"                PRIMARY KEY ("id"),
        CONSTRAINT "FK_players_team"  FOREIGN KEY ("teamId")  REFERENCES "teams"("id")  ON DELETE RESTRICT,
        CONSTRAINT "FK_players_tier"  FOREIGN KEY ("tierId")  REFERENCES "tiers"("id")  ON DELETE RESTRICT
      )
    `);

    /* =====================================================
       TABLE: user_teams  (deps: users)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "user_teams" (
        "id"         SERIAL      NOT NULL,
        "formation"  VARCHAR     NOT NULL DEFAULT '4-3-3',
        "captainId"  INTEGER     ,
        "userId"     INTEGER     NOT NULL,
        "createdAt"  TIMESTAMP   NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_teams_userId"  UNIQUE ("userId"),
        CONSTRAINT "PK_user_teams"         PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_teams_user"    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    /* =====================================================
       TABLE: user_team_players  (deps: user_teams, players)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "user_team_players" (
        "id"           SERIAL    NOT NULL,
        "isStarter"    BOOLEAN   NOT NULL DEFAULT false,
        "subOrder"     INTEGER   ,
        "userTeamId"   INTEGER   NOT NULL,
        "playerId"     INTEGER   NOT NULL,
        "addedAt"      TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_utp_team_player"        UNIQUE ("userTeamId", "playerId"),
        CONSTRAINT "PK_user_team_players"      PRIMARY KEY ("id"),
        CONSTRAINT "FK_utp_userTeam"  FOREIGN KEY ("userTeamId") REFERENCES "user_teams"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_utp_player"    FOREIGN KEY ("playerId")   REFERENCES "players"("id")     ON DELETE RESTRICT
      )
    `);

    /* =====================================================
       TABLE: user_team_history  (deps: users, players)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "user_team_history" (
        "id"          SERIAL                            NOT NULL,
        "action"      "user_team_history_action_enum"   NOT NULL,
        "coinAmount"  BIGINT                            NOT NULL,
        "userId"      INTEGER                           NOT NULL,
        "playerId"    INTEGER                           ,
        "playerName"  VARCHAR                           NOT NULL,
        "createdAt"   TIMESTAMP                         NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_team_history"       PRIMARY KEY ("id"),
        CONSTRAINT "FK_uth_user"    FOREIGN KEY ("userId")   REFERENCES "users"("id")   ON DELETE CASCADE,
        CONSTRAINT "FK_uth_player"  FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL
      )
    `);

    /* =====================================================
       TABLE: marketplace_status  (no deps)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "marketplace_status" (
        "id"         SERIAL    NOT NULL,
        "isOpen"     BOOLEAN   NOT NULL DEFAULT false,
        "openedAt"   TIMESTAMP ,
        "closedAt"   TIMESTAMP ,
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_marketplace_status" PRIMARY KEY ("id")
      )
    `);

    /* =====================================================
       TABLE: transactions  (deps: users)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id"             SERIAL                      NOT NULL,
        "type"           "transactions_type_enum"    NOT NULL,
        "amount"         BIGINT                      NOT NULL,
        "balanceBefore"  BIGINT                      NOT NULL,
        "balanceAfter"   BIGINT                      NOT NULL,
        "description"    VARCHAR                     ,
        "userId"         INTEGER                     NOT NULL,
        "createdAt"      TIMESTAMP                   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions"        PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user"   FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    /* =====================================================
       TABLE: user_cards  (deps: users)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "user_cards" (
        "id"                  SERIAL                  NOT NULL,
        "type"                "user_cards_type_enum"  NOT NULL,
        "used"                BOOLEAN                 NOT NULL DEFAULT false,
        "usedAt"              TIMESTAMP               ,
        "usedInTournamentId"  INTEGER                 ,
        "userId"              INTEGER                 NOT NULL,
        "createdAt"           TIMESTAMP               NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_cards"       PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_cards_user"  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    /* =====================================================
       TABLE: tournaments  (no deps)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "tournaments" (
        "id"         SERIAL                      NOT NULL,
        "name"       VARCHAR                     NOT NULL,
        "stage"      "tournaments_stage_enum"    NOT NULL,
        "status"     "tournaments_status_enum"   NOT NULL DEFAULT 'upcoming',
        "startDate"  TIMESTAMP                   ,
        "endDate"    TIMESTAMP                   ,
        "createdAt"  TIMESTAMP                   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tournaments" PRIMARY KEY ("id")
      )
    `);

    /* =====================================================
       TABLE: matches  (deps: tournaments, teams)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id"               SERIAL                  NOT NULL,
        "apiFootballId"    INTEGER                 ,
        "status"           "matches_status_enum"   NOT NULL DEFAULT 'scheduled',
        "homeScore"        INTEGER                 DEFAULT 0,
        "awayScore"        INTEGER                 DEFAULT 0,
        "kickoff"          TIMESTAMP               ,
        "tournamentId"     INTEGER                 NOT NULL,
        "homeTeamId"       INTEGER                 NOT NULL,
        "awayTeamId"       INTEGER                 NOT NULL,
        "statsCalculated"  BOOLEAN                 NOT NULL DEFAULT false,
        "createdAt"        TIMESTAMP               NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_matches_apiFootballId"  UNIQUE ("apiFootballId"),
        CONSTRAINT "PK_matches"                PRIMARY KEY ("id"),
        CONSTRAINT "FK_matches_tournament"   FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_matches_homeTeam"     FOREIGN KEY ("homeTeamId")   REFERENCES "teams"("id")       ON DELETE RESTRICT,
        CONSTRAINT "FK_matches_awayTeam"     FOREIGN KEY ("awayTeamId")   REFERENCES "teams"("id")       ON DELETE RESTRICT
      )
    `);

    /* =====================================================
       TABLE: match_stats  (deps: matches, players)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "match_stats" (
        "id"               SERIAL    NOT NULL,
        "minutes"          INTEGER   NOT NULL DEFAULT 0,
        "goals"            INTEGER   NOT NULL DEFAULT 0,
        "assists"          INTEGER   NOT NULL DEFAULT 0,
        "cleanSheet"       BOOLEAN   NOT NULL DEFAULT false,
        "yellowCards"      INTEGER   NOT NULL DEFAULT 0,
        "redCards"         INTEGER   NOT NULL DEFAULT 0,
        "saves"            INTEGER   NOT NULL DEFAULT 0,
        "penaltySaved"     INTEGER   NOT NULL DEFAULT 0,
        "penaltyMissed"    INTEGER   NOT NULL DEFAULT 0,
        "penaltyEarned"    INTEGER   NOT NULL DEFAULT 0,
        "penaltyConceded"  INTEGER   NOT NULL DEFAULT 0,
        "ownGoals"         INTEGER   NOT NULL DEFAULT 0,
        "tackles"          INTEGER   NOT NULL DEFAULT 0,
        "goalsConceded"    INTEGER   NOT NULL DEFAULT 0,
        "rawApiData"       JSONB     ,
        "matchId"          INTEGER   NOT NULL,
        "playerId"         INTEGER   NOT NULL,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_match_stats"        PRIMARY KEY ("id"),
        CONSTRAINT "FK_match_stats_match"  FOREIGN KEY ("matchId")  REFERENCES "matches"("id")  ON DELETE CASCADE,
        CONSTRAINT "FK_match_stats_player" FOREIGN KEY ("playerId") REFERENCES "players"("id")  ON DELETE CASCADE
      )
    `);

    /* =====================================================
       TABLE: user_match_scores  (deps: users, matches, tournaments)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "user_match_scores" (
        "id"            SERIAL    NOT NULL,
        "totalPoints"   INTEGER   NOT NULL DEFAULT 0,
        "breakdown"     JSONB     ,
        "userId"        INTEGER   NOT NULL,
        "matchId"       INTEGER   NOT NULL,
        "tournamentId"  INTEGER   NOT NULL,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_ums_user_match"          UNIQUE ("userId", "matchId"),
        CONSTRAINT "PK_user_match_scores"        PRIMARY KEY ("id"),
        CONSTRAINT "FK_ums_user"        FOREIGN KEY ("userId")       REFERENCES "users"("id")       ON DELETE CASCADE,
        CONSTRAINT "FK_ums_match"       FOREIGN KEY ("matchId")      REFERENCES "matches"("id")     ON DELETE CASCADE,
        CONSTRAINT "FK_ums_tournament"  FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE
      )
    `);

    /* =====================================================
       TABLE: leaderboard_snapshots  (deps: users, tournaments)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "leaderboard_snapshots" (
        "id"            SERIAL    NOT NULL,
        "rank"          INTEGER   NOT NULL,
        "totalPoints"   INTEGER   NOT NULL DEFAULT 0,
        "prizeCoins"    BIGINT    NOT NULL DEFAULT 0,
        "userId"        INTEGER   NOT NULL,
        "tournamentId"  INTEGER   NOT NULL,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leaderboard_snapshots"        PRIMARY KEY ("id"),
        CONSTRAINT "FK_ls_user"        FOREIGN KEY ("userId")       REFERENCES "users"("id")       ON DELETE CASCADE,
        CONSTRAINT "FK_ls_tournament"  FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE
      )
    `);

    /* =====================================================
       TABLE: promo_codes  (no deps)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id"          SERIAL                    NOT NULL,
        "code"        VARCHAR                   NOT NULL,
        "type"        "promo_codes_type_enum"   NOT NULL DEFAULT 'campaign',
        "bonusCoins"  BIGINT                    NOT NULL,
        "maxUses"     INTEGER                   ,
        "usedCount"   INTEGER                   NOT NULL DEFAULT 0,
        "onePerUser"  BOOLEAN                   NOT NULL DEFAULT true,
        "isActive"    BOOLEAN                   NOT NULL DEFAULT true,
        "expiresAt"   TIMESTAMP                 ,
        "createdAt"   TIMESTAMP                 NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_promo_codes_code"  UNIQUE ("code"),
        CONSTRAINT "PK_promo_codes"       PRIMARY KEY ("id")
      )
    `);

    /* =====================================================
       TABLE: promo_redemptions  (deps: users, promo_codes)
       ===================================================== */
    await queryRunner.query(`
      CREATE TABLE "promo_redemptions" (
        "id"           SERIAL    NOT NULL,
        "userId"       INTEGER   NOT NULL,
        "promoCodeId"  INTEGER   NOT NULL,
        "redeemedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promo_redemptions"            PRIMARY KEY ("id"),
        CONSTRAINT "FK_pr_user"      FOREIGN KEY ("userId")      REFERENCES "users"("id")       ON DELETE CASCADE,
        CONSTRAINT "FK_pr_promo"     FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE
      )
    `);

    /* =====================================================
       INDEXES — ხშირად გამოყენებული queries-ისთვის
       ===================================================== */
    await queryRunner.query(`CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_transactions_createdAt" ON "transactions" ("createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_user_team_history_userId" ON "user_team_history" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_cards_userId" ON "user_cards" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_stats_matchId" ON "match_stats" ("matchId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_match_scores_userId" ON "user_match_scores" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_match_scores_tournamentId" ON "user_match_scores" ("tournamentId")`);
    await queryRunner.query(`CREATE INDEX "IDX_leaderboard_tournamentId_rank" ON "leaderboard_snapshots" ("tournamentId", "rank")`);
    await queryRunner.query(`CREATE INDEX "IDX_promo_redemptions_userId" ON "promo_redemptions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_players_teamId" ON "players" ("teamId")`);
    await queryRunner.query(`CREATE INDEX "IDX_players_position" ON "players" ("position")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_tournamentId_status" ON "matches" ("tournamentId", "status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    /* drop in reverse dependency order */
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_redemptions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leaderboard_snapshots" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_match_scores" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "match_stats" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "matches" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tournaments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_cards" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace_status" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_team_history" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_team_players" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_teams" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "players" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "teams" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tiers" CASCADE`);

    /* drop enum types */
    await queryRunner.query(`DROP TYPE IF EXISTS "promo_codes_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "matches_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tournaments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tournaments_stage_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_cards_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_team_history_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transactions_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "players_position_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
