import { RoomRepository } from './room.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import dayjs from 'dayjs';
import {
  ResponseOpenRoomsCountDto,
  ResponseRoomDetailDto,
  ResponseRoomListDto,
} from './dto/room-response.dto';
import { RoomMapper } from './mappers/room.mapper';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { PAGINATION_CONSTANTS } from './constants/room.constant';

@Injectable()
export class RoomService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly roomRepository: RoomRepository,
  ) {}

  async createRoom(userId: number, createRoomDto: CreateRoomDto): Promise<ResponseRoomDetailDto> {
    if (dayjs(createRoomDto.lunchAt).isBefore(dayjs()))
      throw new BadRequestException('lunchAt은 현재보다 미래여야 합니다.');

    if (createRoomDto.minAge > createRoomDto.maxAge)
      throw new BadRequestException('최소 나이와 최대 나이 옵션이 올바르지 않습니다.');

    const participatingRoom = await this.roomRepository.findParticipatingRoom(userId);
    if (participatingRoom) throw new BadRequestException('이미 참여 중인 방이 있습니다.');

    const newRoomId = await this.dataSource.transaction(async (manager) => {
      const newRoom = await this.roomRepository.createRoom(manager, userId, createRoomDto);

      const roomId = newRoom.id;

      await this.roomRepository.createRoomMember(manager, userId, roomId);

      return roomId;
    });

    return await this.findRoomById(newRoomId);
  }

  async findRooms(query: FindRoomsQueryDto): Promise<ResponseRoomListDto> {
    if (query.minAge !== undefined && query.maxAge !== undefined && query.minAge > query.maxAge) {
      throw new BadRequestException('최소 나이와 최대 나이 옵션이 올바르지 않습니다.');
    }

    if (
      query.lunchAtFrom !== undefined &&
      query.lunchAtTo !== undefined &&
      dayjs(query.lunchAtFrom).isAfter(dayjs(query.lunchAtTo))
    ) {
      throw new BadRequestException('lunchAt 옵션이 올바르지 않습니다.');
    }

    const limit = query.limit ?? PAGINATION_CONSTANTS.DEFAULT_LIMIT;
    const rooms = (await this.roomRepository.findRooms(query)) || [];
    const hasNext = rooms.length > limit;
    const paginatedRooms = hasNext ? rooms.slice(0, limit) : rooms;
    const nextCursor = hasNext ? paginatedRooms[paginatedRooms.length - 1].id : null;

    return RoomMapper.toListDto(paginatedRooms, nextCursor, hasNext);
  }

  async findRoomById(roomId: number): Promise<ResponseRoomDetailDto> {
    const room = await this.roomRepository.findRoomById(roomId);

    if (!room) throw new NotFoundException(`존재하지 않는 방입니다.`);

    return RoomMapper.toDetailDto(room);
  }

  async findOpenRoomsCount(): Promise<ResponseOpenRoomsCountDto> {
    const openRoomsCount = (await this.roomRepository.findOpenRoomsCount()) || 0;

    return {
      openRoomsCount,
    };
  }
}
