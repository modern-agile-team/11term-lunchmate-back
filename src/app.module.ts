import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './users/users.module';
import { TypeOrmConfigService } from './config/database.config';
import { RoomModule } from './rooms/rooms.module';
import { LunchMenuModule } from './lunchMenus/lunch-menus.module';
import { CommentModule } from './comments/comments.module';
import { PostCategoryModule } from './post-categories/post-categories.module';
import { PostModule } from './posts/posts.module';
import { FriendModule } from './friends/friends.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
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
