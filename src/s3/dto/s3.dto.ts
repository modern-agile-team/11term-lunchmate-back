import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
  @ApiProperty({
    example:
      'https://lunchmate-s3.s3.ap-northeast-2.amazonaws.com/profile-images/1_1752000000000_uuid.png',
    description: '프로필 이미지 URL',
  })
  imageURL: string;
}
