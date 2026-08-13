import { ApiProperty } from '@nestjs/swagger';
import { UserGender } from '../types/user.type';

export class PublicUserResponseDto {
  id: number;

  nickname: string;

  birthDate: string;

  @ApiProperty({ enum: UserGender })
  gender: UserGender;

  schoolInfo: string;

  @ApiProperty({ nullable: true })
  introduce: string | null;

  @ApiProperty({ nullable: true })
  mbti: string | null;

  createdAt: string;

  @ApiProperty({
    nullable: true,
    example:
      'https://lunchmate-s3.s3.ap-northeast-2.amazonaws.com/profile-images/1_1752000000000_uuid.png',
  })
  profileImageUrl: string | null;
}
