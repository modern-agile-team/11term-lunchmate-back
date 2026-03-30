import { RoomRepository } from './room.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResponseRoomDetailDto } from './dto/room-response.dto';
import { RoomMapper } from './mappers/room.mapper';

@Injectable()
export class RoomService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly roomRepository: RoomRepository,
  ) {}

  async createRoom(userId: number, createRoomDto: CreateRoomDto): Promise<ResponseRoomDetailDto> {
    if (new Date(createRoomDto.lunchAt) < new Date())
      throw new BadRequestException('lunchAt은 현재보다 미래여야 합니다.');
    if (createRoomDto.minAge > createRoomDto.maxAge)
      throw new BadRequestException('최소 나이는 최대 나이보다 클 수 없습니다.');

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

  async findRoomById(roomId: number): Promise<ResponseRoomDetailDto> {
    const room = await this.roomRepository.findRoomById(roomId);

    if (!room) throw new NotFoundException(`존재하지 않는 방입니다.`);

    return RoomMapper.toDetailDto(room);
  }
}
