import { ApiProperty } from '@nestjs/swagger';
import { MeUserResponseDto } from '../../users/dto/me-user-response.dto';

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthResponseDto extends AuthTokensResponseDto {
  @ApiProperty({ type: MeUserResponseDto })
  user: MeUserResponseDto;
}
