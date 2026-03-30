import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomModule } from './rooms/rooms.module';
import { MealMenuModule } from './meal-menus/meal-menus.module';
import { CommentModule } from './comments/comments.module';
import { PostCategoryModule } from './post-categories/post-categories.module';
import { PostModule } from './posts/posts.module';
import { FriendModule } from './friends/friends.module';
import { UserModule } from './users/users.module';
import { TypeOrmConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { WinstonModule } from 'nest-winston';
import { winstonOptions } from './config/winston.config';
import { AllExceptionFilter } from './commons/filters/all-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfig,
    }),
    WinstonModule.forRoot({
      transports: winstonOptions,
    }),
    AuthModule,
    UserModule,
    RoomModule,
    MealMenuModule,
    CommentModule,
    PostCategoryModule,
    PostModule,
    FriendModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule {}
