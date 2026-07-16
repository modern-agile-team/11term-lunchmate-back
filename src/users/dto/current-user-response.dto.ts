import { ApiProperty } from '@nestjs/swagger';
import { Mbti, UserGender, UserRole } from '../types/user.type';

export class CurrentUserResponseDto {
  id: number;

  nickname: string;

  birthDate: string;

  @ApiProperty({ enum: UserGender })
  gender: UserGender;

  schoolInfo: string;

  @ApiProperty({ nullable: true, example: '오늘 점심 메이트 구해요.' })
  introduce: string | null;

  @ApiProperty({ nullable: true, enum: Mbti, example: 'ENFP' })
  mbti: string | null;

  createdAt: string;

  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}
