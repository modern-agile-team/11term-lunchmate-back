import { ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty({ nullable: true })
  profileImageUrl: string | null;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  mbti: string | null;

  @ApiProperty()
  createdAt: Date;
}
