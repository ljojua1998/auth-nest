import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { TiersModule } from './tiers/tiers.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),

    UsersModule,
    AuthModule,
    ChatModule,
    TiersModule,
    TeamsModule,
    PlayersModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
