import { ApiProperty } from '@nestjs/swagger';
import { PublicUserResponseDto } from './public-user-response.dto';

export class CurrentUserResponseDto extends PublicUserResponseDto {
  @ApiProperty()
  email: string;
}
