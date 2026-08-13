import { ApiProperty } from '@nestjs/swagger';
import { UserSearchResultDto } from './user-search-result.dto';

export class UserSearchResponseDto {
  @ApiProperty({ type: [UserSearchResultDto] })
  items: UserSearchResultDto[];
}
