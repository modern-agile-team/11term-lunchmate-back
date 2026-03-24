import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Room, RoomMember])],
  controllers: [],
  providers: [],
})
export class RoomModule {}
