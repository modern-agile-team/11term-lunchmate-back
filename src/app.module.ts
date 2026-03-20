import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomModule } from './rooms/rooms.module';
import { LunchMenuModule } from './lunchMenus/lunch-menus.module';
import { CommentModule } from './comments/comments.module';
import { PostCategoryModule } from './post-categories/post-categories.module';
import { PostModule } from './posts/posts.module';
import { FriendModule } from './friends/friends.module';
import { UserModule } from './users/users.module';
import { TypeOrmConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfig,
    }),
    UserModule,
    RoomModule,
    LunchMenuModule,
    CommentModule,
    PostCategoryModule,
    PostModule,
    FriendModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
