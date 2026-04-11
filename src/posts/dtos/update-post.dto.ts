import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class UpdatePostPayloadDto extends OmitType(UpdatePostDto, ['categoryId']) {
  category?: { id: number };
}
