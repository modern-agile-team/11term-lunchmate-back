import { Injectable } from '@nestjs/common';
import { PostRepository } from './posts.repository';

@Injectable()
export class PostService {
  constructor(private readonly postRepository: PostRepository) {}
}
