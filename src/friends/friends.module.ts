import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../users/users.module';
import { Friend } from './entities/friend.entity';
import { FriendController } from './friends.controller';
import { FriendRepository } from './friends.repository';
import { FriendService } from './friends.service';

@Module({
  imports: [TypeOrmModule.forFeature([Friend]), forwardRef(() => UserModule)],
  controllers: [FriendController],
  providers: [FriendRepository, FriendService],
  exports: [FriendService],
})
export class FriendModule {}
