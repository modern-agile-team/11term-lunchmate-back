import { calculateAge } from 'src/commons/utils/age.util';
import { RoomMember } from '../entities/room-member.entity';
import {
  ResponseRoomJoinDto,
  ResponseRoomMemberDto,
  ResponseRoomMemberListDto,
} from '../dto/room-member.response.dto';

export class RoomMemberMapper {
  static toItemDto(roomMember: RoomMember): ResponseRoomMemberDto {
    return {
      id: roomMember.user.id,
      nickname: roomMember.user.nickname,
      age: calculateAge(roomMember.user.birthDate),
      gender: roomMember.user.gender,
      schoolInfo: roomMember.user.schoolInfo,
      mbti: roomMember.user.mbti,
    };
  }

  static toListDto(roomMembers: RoomMember[]): ResponseRoomMemberListDto {
    return {
      items: roomMembers.map((roomMember) => this.toItemDto(roomMember)),
    };
  }

  static toJoinDto(roomMember: RoomMember): ResponseRoomJoinDto {
    return {
      roomId: roomMember.room.id,
      userId: roomMember.user.id,
      createdAt: roomMember.createdAt.toISOString(),
    };
  }
}
