import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { newDb } from 'pg-mem';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthModule } from '../src/auth/auth.module';
import { validationPipeOptions } from '../src/commons/validation/validation-pipe-options';
import { CommentLike } from '../src/comments/entities/comment-like.entity';
import { Comment } from '../src/comments/entities/comment.entity';
import { Friend } from '../src/friends/entities/friend.entity';
import { MealMenuReaction } from '../src/meal-menus/entities/meal-menu-reaction.entity';
import { MealMenu } from '../src/meal-menus/entities/meal-menu.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { PostLike } from '../src/posts/entities/post-like.entity';
import { Post } from '../src/posts/entities/post.entity';
import { RoomMember } from '../src/rooms/entities/room-member.entity';
import { Room } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { UserModule } from '../src/users/users.module';

const TEST_ENTITIES = [
  User,
  Friend,
  Room,
  RoomMember,
  Post,
  PostLike,
  PostCategory,
  Comment,
  CommentLike,
  MealMenu,
  MealMenuReaction,
];

export async function createCoreTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [AppController],
    providers: [AppService],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  await app.init();

  return app;
}

export async function createAuthUserTestApp(): Promise<INestApplication> {
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
      }),
      TypeOrmModule.forRootAsync({
        useFactory: () => ({
          type: 'postgres',
          synchronize: true,
          logging: false,
          entities: TEST_ENTITIES,
        }),
        dataSourceFactory: async (options) => {
          const db = newDb({
            autoCreateForeignKeyIndices: true,
          });

          db.public.registerFunction({
            name: 'current_database',
            implementation: () => 'lunchmate_test',
          });
          db.public.registerFunction({
            name: 'version',
            implementation: () => 'PostgreSQL 16.0',
          });

          const dataSource = db.adapters.createTypeormDataSource(options as DataSourceOptions);

          if (!dataSource.isInitialized) {
            await dataSource.initialize();
          }

          return dataSource as DataSource;
        },
      }),
      UserModule,
      AuthModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  await app.init();

  return app;
}
