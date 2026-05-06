import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Room, RoomStatus, RoomType } from './entities/room.entity';
import {
  Between,
  DeleteResult,
  EntityManager,
  FindOptionsWhere,
  In,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  UpdateResult,
} from 'typeorm';
import { PAGINATION_CONSTANTS } from './constants/room.constant';
import { CreateRoomProps, UpdateRoomProps, UserConditionsParam } from './types/room.type';

@Injectable()
export class RoomRepository {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
  ) {}

  async createRoom(manager: EntityManager, createRoomProps: CreateRoomProps): Promise<Room> {
    return await manager.save(Room, createRoomProps);
  }

  async findRoomById(roomId: number, manager?: EntityManager): Promise<Room | null> {
    const queryOptions = {
      where: { id: roomId },
      relations: {
        hostUser: true,
        roomMembers: {
          user: true,
        },
      },
      order: {
        roomMembers: {
          createdAt: 'ASC' as const,
        },
      },
    };

    if (manager) return await manager.findOne(Room, queryOptions);

    return await this.roomRepository.findOne(queryOptions);
  }

  async findRooms(query: FindRoomsQueryDto): Promise<Room[]> {
    const where: FindOptionsWhere<Room> = this.findRoomFilter(query);
    const limit = query.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;

    return await this.roomRepository.find({
      where,
      relations: {
        hostUser: true,
      },
      order: {
        id: 'DESC',
      },
      take: limit + 1,
    });
  }

  findRoomFilter(query: FindRoomsQueryDto): FindOptionsWhere<Room> {
    const where: FindOptionsWhere<Room> = {};

    if (query.roomType) where.roomType = query.roomType;
    if (query.status) where.status = query.status;

    if (query.maxAge !== undefined) where.maxAge = LessThanOrEqual(query.maxAge);
    if (query.minAge !== undefined) where.minAge = MoreThanOrEqual(query.minAge);

    if (query.lunchAtFrom !== undefined && query.lunchAtTo !== undefined) {
      where.lunchAt = Between(query.lunchAtFrom, query.lunchAtTo);
    } else if (query.lunchAtFrom !== undefined) {
      where.lunchAt = MoreThanOrEqual(query.lunchAtFrom);
    } else if (query.lunchAtTo !== undefined) {
      where.lunchAt = LessThanOrEqual(query.lunchAtTo);
    }

    if (query.cursor !== undefined) where.id = LessThan(query.cursor);

    return where;
  }

  async findOpenRoomsCount(): Promise<number> {
    return await this.roomRepository.count({
      where: {
        status: RoomStatus.OPEN,
      },
    });
  }

  async findJoinableRooms(
    userConditions: UserConditionsParam,
    manager: EntityManager,
  ): Promise<Room[]> {
    return await manager
      .createQueryBuilder(Room, 'room')
      .where('room.status = :status', { status: RoomStatus.OPEN })
      .andWhere('(room.roomType = :type OR room.roomType = :any)', {
        type: RoomType[userConditions.gender],
        any: RoomType.ANY,
      })
      .andWhere('room.maxAge >= :age', { age: userConditions.age })
      .andWhere('room.minAge <= :age', { age: userConditions.age })
      .andWhere('room.currentMembersCount < room.maxMembersCount')
      .getMany();
  }

  async updateRoom(roomId: number, updateRoomProps: UpdateRoomProps): Promise<UpdateResult> {
    return await this.roomRepository.update(roomId, updateRoomProps);
  }

  async deleteRoom(roomId: number, manager?: EntityManager): Promise<DeleteResult> {
    if (manager) {
      return await manager.softDelete(Room, roomId);
    }

    return await this.roomRepository.softDelete(roomId);
  }

  async increaseCurrentMembersCount(manager: EntityManager, roomId: number) {
    return await manager.increment(Room, { id: roomId }, 'currentMembersCount', 1);
  }

  async decreaseCurrentMembersCount(manager: EntityManager, roomId: number) {
    return await manager.decrement(Room, { id: roomId }, 'currentMembersCount', 1);
  }

  async updateRoomHostUser(manager: EntityManager, roomId: number, newHostUserId: number) {
    return await manager.update(Room, roomId, {
      hostUserId: newHostUserId,
    });
  }

  async findExpiredOpenRooms(now: string): Promise<Room[]> {
    return await this.roomRepository.find({
      where: {
        status: RoomStatus.OPEN,
        lunchAt: LessThan(now),
      },
    });
  }

  async closeRooms(roomIds: number[]): Promise<UpdateResult> {
    return await this.roomRepository.update({ id: In(roomIds) }, { status: RoomStatus.CLOSE });
  }
}
