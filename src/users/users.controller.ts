import { Controller, Get } from '@nestjs/common';
import { UserService } from './users.service';
import { User } from './entities/user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAllUsers(): Promise<User[]> {
    return await this.userService.findAllUsers();
  }
}
