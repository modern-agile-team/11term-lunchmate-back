import { ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  id: number;

  nickname: string;

  birthDate: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  gender: 'MALE' | 'FEMALE';

  schoolInfo: string;

  @ApiProperty({ nullable: true })
  introduce: string | null;

  @ApiProperty({ nullable: true })
  mbti: string | null;

  createdAt: string;
}
