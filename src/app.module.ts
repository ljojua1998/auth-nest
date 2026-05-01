import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { TiersModule } from './tiers/tiers.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UserTeamsModule } from './user-teams/user-teams.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CardsModule } from './cards/cards.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { MatchesModule } from './matches/matches.module';
import { ScoringModule } from './scoring/scoring.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        ssl: { rejectUnauthorized: false },
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    AuthModule,
    ChatModule,
    TiersModule,
    TeamsModule,
    PlayersModule,
    TransactionsModule,
    UserTeamsModule,
    MarketplaceModule,
    CardsModule,
    TournamentsModule,
    MatchesModule,
    ScoringModule,
    LeaderboardModule,
    PromotionsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
