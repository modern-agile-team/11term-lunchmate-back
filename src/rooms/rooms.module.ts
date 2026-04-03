import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { RoomController } from './rooms.controller';
import { RoomService } from './rooms.service';
import { RoomRepository } from './room.repository';
import { RoomMemberRepository } from './roomMember.repository';
import { UserService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { UserRepository } from 'src/users/users.repository';
import { RoomMemberService } from './roomMember.service';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomMember, User])],
  controllers: [RoomController],
  providers: [
    RoomService,
    RoomRepository,
    RoomMemberService,
    RoomMemberRepository,
    UserService,
    UserRepository,
  ],
})
export class RoomModule {}
