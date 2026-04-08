import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomMember } from './entities/room-member.entity';
import { Room, RoomStatus } from './entities/room.entity';
import {
  Between,
  DeleteResult,
  EntityManager,
  FindOptionsWhere,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  UpdateResult,
} from 'typeorm';
import { PAGINATION_CONSTANTS } from './constants/room.constant';

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

  async updateRoom(roomId: number, updateRoomDto: UpdateRoomDto): Promise<UpdateResult> {
    return await this.roomRepository.update(roomId, updateRoomDto);
  }

  async deleteRoom(roomId: number): Promise<DeleteResult> {
    return await this.roomRepository.softDelete(roomId);
  }
}
