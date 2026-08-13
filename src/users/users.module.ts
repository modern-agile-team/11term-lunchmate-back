import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendModule } from '../friends/friends.module';
import { S3Module } from '../s3/s3.module';
import { User } from './entities/user.entity';
import { UserController } from './users.controller';
import { UserRepository } from './users.repository';
import { UserService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), S3Module, forwardRef(() => FriendModule)],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
