import { ApiProperty } from '@nestjs/swagger';
import { CurrentUserResponseDto } from '../../users/dto/current-user-response.dto';

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthResponseDto extends AuthTokensResponseDto {
  @ApiProperty({ type: CurrentUserResponseDto })
  user: CurrentUserResponseDto;
}
