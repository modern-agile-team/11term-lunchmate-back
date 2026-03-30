import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { RoomController } from './rooms.controller';
import { RoomService } from './rooms.service';
import { RoomRepository } from './room.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomMember])],
  controllers: [RoomController],
  providers: [RoomService, RoomRepository],
})
export class RoomModule {}
