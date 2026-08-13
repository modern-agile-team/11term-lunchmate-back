import { ApiProperty } from '@nestjs/swagger';
import { RelationshipStatus } from '../../friends/types/relationship-status.type';

export class UserSearchResultDto {
  id: number;

  nickname: string;

  @ApiProperty({ nullable: true })
  profileImageUrl: string | null;

  schoolInfo: string;

  @ApiProperty({ enum: RelationshipStatus })
  relationshipStatus: RelationshipStatus;
}
