import { ApiProperty } from '@nestjs/swagger';

export class ResponseRoomMemberDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  age: number;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  gender: 'MALE' | 'FEMALE';

  @ApiProperty()
  schoolInfo: string;

  @ApiProperty()
  mbti: string | null;
}

export class ResponseRoomMemberListDto {
  @ApiProperty()
  items: ResponseRoomMemberDto[];
}

export class ResponseRoomJoinDto {
  @ApiProperty()
  roomId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  createdAt: string;
}
