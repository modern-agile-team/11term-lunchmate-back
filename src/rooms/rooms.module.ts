import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { RoomController } from './rooms.controller';
import { RoomService } from './rooms.service';
import { RoomRepository } from './room.repository';
import { RoomMemberRepository } from './roomMember.repository';
import { User } from 'src/users/entities/user.entity';
import { UserModule } from 'src/users/users.module';
import { RoomMemberService } from './roomMember.service';
import { RoomGateway } from './rooms.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { RoomScheduler } from './schedulers/room.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomMember, User]), AuthModule, UserModule],
  controllers: [RoomController],
  providers: [
    RoomScheduler,
    RoomService,
    RoomRepository,
    RoomMemberService,
    RoomMemberRepository,
    RoomGateway,
  ],
})
export class RoomModule {}
