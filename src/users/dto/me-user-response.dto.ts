import { ApiProperty } from '@nestjs/swagger';
import { PublicUserResponseDto } from './public-user-response.dto';

export class MeUserResponseDto extends PublicUserResponseDto {
  @ApiProperty()
  email: string;
}
