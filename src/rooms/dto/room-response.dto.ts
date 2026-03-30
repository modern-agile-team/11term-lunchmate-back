export class ResponseRoomMemberDto {
  id: number;
  nickname: string;
  gender: string;
  schoolInfo: string;
}

export class ResponseRoomDetailDto {
  id: number;
  title: string;
  description: string | null;
  roomType: string;
  status: string;
  maxMembersCount: number;
  currentMembersCount: number;
  minAge: number;
  maxAge: number;
  place: string;
  lunchAt: string;
  createdAt: string;
  hostUserId: number;
  roomMembers: ResponseRoomMemberDto[];
}
