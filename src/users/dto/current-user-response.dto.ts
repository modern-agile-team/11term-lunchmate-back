import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  birthDate: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  gender: 'MALE' | 'FEMALE';

  @ApiProperty()
  schoolInfo: string;

  @ApiProperty({ nullable: true })
  introduce: string | null;

  @ApiProperty({ nullable: true })
  mbti: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  email: string;
}
