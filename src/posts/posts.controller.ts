import { Controller } from '@nestjs/common';
import { PostService } from './posts.service';
import { Post } from '@nestjs/common';
import { CreatePostDto } from './dtos/create-post.dto';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  async createPost(createPostDto: CreatePostDto): Promise<ResponsePostDetailDto> {}
}
