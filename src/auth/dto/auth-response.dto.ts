import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  birthDate: string;

  @ApiProperty()
  gender: 'MALE' | 'FEMALE';

  @ApiProperty()
  schoolInfo: string;

  @ApiProperty({ nullable: true })
  introduce: string | null;

  @ApiProperty({ nullable: true })
  mbti: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthResponseDto extends AuthTokensResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}
