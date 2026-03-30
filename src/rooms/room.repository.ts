import { CreateRoomDto } from './dto/create-room.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomMember } from './entities/room-member.entity';
import { Room, RoomStatus } from './entities/room.entity';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomMember)
    private readonly roomMemberRepository: Repository<RoomMember>,
  ) {}

  async createRoom(
    manager: EntityManager,
    userId: number,
    createRoomDto: CreateRoomDto,
  ): Promise<Room> {
    return await manager.save(Room, {
      ...createRoomDto,
      hostUser: { id: userId },
    });
  }

  async createRoomMember(
    manager: EntityManager,
    userId: number,
    roomId: number,
  ): Promise<RoomMember> {
    return await manager.save(RoomMember, {
      room: { id: roomId },
      user: { id: userId },
    });
  }

  async findParticipatingRoom(userId: number): Promise<RoomMember | null> {
    return await this.roomMemberRepository.findOne({
      where: {
        user: { id: userId },
        room: { status: RoomStatus.OPEN },
      },
      relations: {
        room: true,
      },
    });
  }

  async findRoomById(roomId: number): Promise<Room | null> {
    return await this.roomRepository.findOne({
      where: { id: roomId },
      relations: {
        hostUser: true,
        roomMembers: {
          user: true,
        },
      },
    });
  }
}
