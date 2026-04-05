import { Injectable } from '@nestjs/common';
import { RoomMemberRepository } from './roomMember.repository';
import { EntityManager } from 'typeorm';
import { ResponseRoomMemberListDto } from './dto/room-member.response.dto';
import { RoomMemberMapper } from './mappers/room-member.mapper';
import { RoomMember } from './entities/room-member.entity';

@Injectable()
export class RoomMemberService {
  constructor(private readonly roomMemberRepository: RoomMemberRepository) {}

  async findRoomMembersByRoomId(roomId: number): Promise<ResponseRoomMemberListDto> {
    const roomMembers = await this.roomMemberRepository.findRoomMembersByRoomId(roomId);
    return RoomMemberMapper.toListDto(roomMembers);
  }

  async findRoomMemberCount(manager: EntityManager, roomId: number): Promise<number> {
    return await this.roomMemberRepository.findRoomMemberCount(manager, roomId);
  }

  async findParticipatingRoomByUserId(userId: number, manager?: EntityManager) {
    return await this.roomMemberRepository.findParticipatingRoomByUserId(userId, manager);
  }

  async createRoomMember(
    manager: EntityManager,
    userId: number,
    roomId: number,
  ): Promise<RoomMember> {
    return await this.roomMemberRepository.createRoomMember(manager, userId, roomId);
  }

  async joinRoom(manager: EntityManager, roomId: number, userId: number) {
    return await this.roomMemberRepository.joinRoom(manager, roomId, userId);
  }

  async leaveRoom(manager: EntityManager, roomId: number, userId: number) {
    return await this.roomMemberRepository.leaveRoom(manager, roomId, userId);
  }

  async isRoomMember(roomId: number, userId: number, manager?: EntityManager): Promise<boolean> {
    return await this.roomMemberRepository.isRoomMember(roomId, userId, manager);
  }

  async findFirstJoinedMemberId(manager: EntityManager, roomId: number, userId: number) {
    const hostUser = await this.roomMemberRepository.findFirstJoinedMember(manager, roomId, userId);
    return hostUser?.user.id;
  }
}
