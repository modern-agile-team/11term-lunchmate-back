import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomMember } from './entities/room-member.entity';
import { EntityManager, Not, Repository } from 'typeorm';

@Injectable()
export class RoomMemberRepository {
  constructor(
    @InjectRepository(RoomMember)
    private readonly roomMemberRepository: Repository<RoomMember>,
  ) {}

  async findRoomMembersByRoomId(roomId: number): Promise<RoomMember[]> {
    return await this.roomMemberRepository.find({
      where: { room: { id: roomId } },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findRoomMemberCount(manager: EntityManager, roomId: number): Promise<number> {
    return await manager.count(RoomMember, {
      where: {
        room: { id: roomId },
      },
    });
  }

  async isRoomMember(roomId: number, userId: number, manager?: EntityManager): Promise<boolean> {
    const queryOptions = {
      where: {
        room: { id: roomId },
        user: { id: userId },
      },
    };

    if (manager) return await manager.exists(RoomMember, queryOptions);

    return await this.roomMemberRepository.exists(queryOptions);
  }

  async joinRoom(manager: EntityManager, roomId: number, userId: number) {
    return await manager.save(RoomMember, {
      room: { id: roomId },
      user: { id: userId },
    });
  }

  async leaveRoom(manager: EntityManager, roomId: number, userId: number) {
    return await manager.delete(RoomMember, {
      room: { id: roomId },
      user: { id: userId },
    });
  }

  async findFirstJoinedMember(manager: EntityManager, roomId: number, userId: number) {
    return await manager.findOne(RoomMember, {
      where: {
        room: { id: roomId },
        user: { id: Not(userId) },
      },
      relations: { user: true },
      order: {
        id: 'ASC',
      },
    });
  }
}
