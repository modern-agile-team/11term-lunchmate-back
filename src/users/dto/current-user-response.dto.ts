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

  @ApiProperty({
    nullable: true,
    example:
      'https://lunchmate-s3.s3.ap-northeast-2.amazonaws.com/profile-images/1_1752000000000_uuid.png',
  })
  profileImageUrl: string | null;
}
