import { RoomMemberService } from './roomMember.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomRepository } from './room.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import dayjs from 'dayjs';
import {
  ResponseOpenRoomsCountDto,
  ResponseRoomDetailDto,
  ResponseRoomListDto,
} from './dto/room-response.dto';
import { RoomMapper } from './mappers/room.mapper';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { PAGINATION_CONSTANTS } from './constants/room.constant';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UserService } from 'src/users/users.service';
import { Room, RoomStatus, RoomType } from './entities/room.entity';
import { calculateAge } from 'src/commons/utils/age.util';
import { RoomMember } from './entities/room-member.entity';
import { MeUserResponseDto } from 'src/users/dto/me-user-response.dto';

@Injectable()
export class RoomService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly roomRepository: RoomRepository,
    private readonly roomMemberService: RoomMemberService,
    private readonly userService: UserService,
  ) {}

  async createRoom(userId: number, createRoomDto: CreateRoomDto): Promise<ResponseRoomDetailDto> {
    await this.validateParticipatingRoom(userId);

    this.validateRoomProperties(createRoomDto);

    const newRoomId = await this.dataSource.transaction(async (manager) => {
      const newRoom = await this.roomRepository.createRoom(manager, userId, createRoomDto);

      const roomId = newRoom.id;

      await this.roomMemberService.createRoomMember(manager, userId, roomId);

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
    const room = await this.findExistingRoomOrThrow(roomId);

    return RoomMapper.toDetailDto(room);
  }

  async findOpenRoomsCount(): Promise<ResponseOpenRoomsCountDto> {
    const openRoomsCount = (await this.roomRepository.findOpenRoomsCount()) || 0;

    return {
      openRoomsCount,
    };
  }

  async findRoomMembersByRoomId(roomId: number) {
    await this.findExistingRoomOrThrow(roomId);

    return await this.roomMemberService.findRoomMembersByRoomId(roomId);
  }

  async findParticipatingRoomByUserId(userId: number) {
    const room = await this.roomMemberService.findParticipatingRoomByUserId(userId);

    if (!room) throw new BadRequestException('현재 참여중인 방이 없습니다.');

    return RoomMapper.toDetailDto(room.room);
  }

  async updateRoom(
    roomId: number,
    updateRoomDto: UpdateRoomDto,
    userId: number,
  ): Promise<ResponseRoomDetailDto> {
    const existingRoom = await this.findExistingRoomOrThrow(roomId);

    if (existingRoom.hostUser.id !== userId)
      throw new ForbiddenException('방장만 방을 수정할 수 있습니다.');

    if (Object.keys(updateRoomDto).length < 1) return RoomMapper.toDetailDto(existingRoom);

    const mergeRoomForValidation = {
      minAge: updateRoomDto.minAge ?? existingRoom.minAge,
      maxAge: updateRoomDto.maxAge ?? existingRoom.maxAge,
      lunchAt: updateRoomDto.lunchAt ?? existingRoom.lunchAt,
    };
    this.validateRoomProperties(mergeRoomForValidation);

    await this.roomRepository.updateRoom(roomId, updateRoomDto);

    return await this.findRoomById(roomId);
  }

  async deleteRoom(roomId: number, userId: number): Promise<void> {
    const existingRoom = await this.findExistingRoomOrThrow(roomId);

    if (existingRoom.hostUser.id !== userId)
      throw new ForbiddenException('방장만 방을 삭제할 수 있습니다.');

    const deletedRoom = await this.roomRepository.deleteRoom(roomId);
    if (!deletedRoom.affected) throw new NotFoundException('존재하지 않는 방입니다.');
  }

  async joinRoom(roomId: number, userId: number): Promise<RoomMember> {
    const currentUser = await this.userService.findMe(userId);
    const existingRoom = await this.findExistingRoomOrThrow(roomId);

    await this.validateParticipatingRoom(userId);

    this.validateJoinRoom(existingRoom, currentUser);

    return await this.joinRoomTransaction(existingRoom, userId);
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    const existingRoom = await this.findExistingRoomOrThrow(roomId);

    await this.validateExistingRoomMember(roomId, userId);

    await this.leaveRoomTransaction(existingRoom, userId);
  }

  async kickRoomMember(roomId: number, targetUserId: number, currentUserId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.validateKickRoomMember(manager, roomId, targetUserId, currentUserId);
      await this.leaveRoomAndDecreaseMemberCount(manager, roomId, targetUserId);
    });
  }

  async joinRoomTransaction(room: Room, userId: number): Promise<RoomMember> {
    return await this.dataSource.transaction(async (manager) => {
      const memberCount = await this.roomMemberService.findRoomMemberCount(manager, room.id);
      if (room.maxMembersCount <= memberCount)
        throw new BadRequestException('방 인원이 가득 차 참여할 수 없습니다.');

      await this.roomRepository.increaseCurrentMembersCount(manager, room.id);
      return await this.roomMemberService.joinRoom(manager, room.id, userId);
    });
  }

  async leaveRoomTransaction(room: Room, userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.leaveRoomAndDecreaseMemberCount(manager, room.id, userId);

      await this.updateHostUser(manager, room, userId);

      const roomMembersCount = await this.roomMemberService.findRoomMemberCount(manager, room.id);
      if (roomMembersCount < 1) await this.roomRepository.deleteRoom(room.id, manager);
    });
  }

  async leaveRoomAndDecreaseMemberCount(
    manager: EntityManager,
    roomId: number,
    userId: number,
  ): Promise<void> {
    await this.roomRepository.decreaseCurrentMembersCount(manager, roomId);
    await this.roomMemberService.leaveRoom(manager, roomId, userId);
  }

  async updateHostUser(manager: EntityManager, room: Room, userId: number): Promise<void> {
    if (room.hostUser.id === userId) {
      const newHostUserId = await this.roomMemberService.findFirstJoinedMemberId(
        manager,
        room.id,
        userId,
      );

      if (newHostUserId)
        await this.roomRepository.updateRoomHostUser(manager, room.id, newHostUserId);
    }
  }

  validateRoomProperties(dto: { minAge?: number; maxAge?: number; lunchAt?: string }): void {
    if (dto.minAge !== undefined && dto.maxAge !== undefined && dto.minAge > dto.maxAge)
      throw new BadRequestException('최소 나이와 최대 나이 옵션이 올바르지 않습니다.');

    if (dto.lunchAt && dayjs(dto.lunchAt).isBefore(dayjs()))
      throw new BadRequestException('lunchAt은 현재보다 미래여야 합니다.');
  }

  async validateKickRoomMember(
    manager: EntityManager,
    roomId: number,
    targetUserId: number,
    currentUserId: number,
  ): Promise<void> {
    const currentRoom = await this.findExistingRoomOrThrow(roomId, manager);
    if (currentRoom.hostUserId !== currentUserId)
      throw new ForbiddenException('강제퇴장은 방장만 할 수 있습니다.');

    if (targetUserId === currentUserId)
      throw new BadRequestException('자기 자신을 강제퇴장 시킬 수 없습니다.');

    if (targetUserId === currentRoom.hostUserId)
      throw new BadRequestException('방장은 강제퇴장 시킬 수 없습니다.');

    await this.validateExistingRoomMember(currentRoom.id, targetUserId, manager);
  }

  validateJoinRoom(room: Room, user: MeUserResponseDto): void {
    if (room.status !== RoomStatus.OPEN) throw new BadRequestException('입장할 수 없는 방입니다.');

    const roomTypeByGender = {
      MALE: RoomType.MALE,
      FEMALE: RoomType.FEMALE,
    };
    const userAge = calculateAge(user.birthDate);
    if (
      (room.roomType !== RoomType.ANY && room.roomType !== roomTypeByGender[user.gender]) ||
      room.minAge > userAge ||
      room.maxAge < userAge
    )
      throw new BadRequestException('사용자 정보가 방 조건에 맞지 않습니다.');
  }

  async validateParticipatingRoom(userId: number): Promise<void> {
    const participatingRoom = await this.roomMemberService.findParticipatingRoomByUserId(userId);
    if (participatingRoom) throw new BadRequestException('이미 참여 중인 방이 있습니다.');
  }

  async validateExistingRoomMember(
    roomId: number,
    userId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const isRoomMember = await this.roomMemberService.isRoomMember(roomId, userId, manager);
    if (!isRoomMember) throw new BadRequestException('현재 방에 참여중인 사용자가 아닙니다.');
  }

  async findExistingRoomOrThrow(roomId: number, manager?: EntityManager): Promise<Room> {
    const existingRoom = manager
      ? await this.roomRepository.findRoomById(roomId, manager)
      : await this.roomRepository.findRoomById(roomId);

    if (!existingRoom) throw new NotFoundException('존재하지 않는 방입니다.');

    return existingRoom;
  }
}
