import { ConflictException, Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserRepository } from './users.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async createUser(params: {
    email: string;
    birthDate: string;
    gender: 'MALE' | 'FEMALE';
    nickname: string;
    hashedPassword: string;
    schoolInfo: string;
    introduce: string | null;
    mbti: string | null;
  }): Promise<User> {
    return this.userRepository.createUser(params);
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.userRepository.existsByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }
  }

  async assertNicknameAvailable(
    nickname: string,
  ): Promise<void> {
    const existingUser = await this.userRepository.existsByNickname(nickname);

    if (existingUser) {
      throw new ConflictException('Nickname already exists.');
    }
  }

  toMeResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      birthDate: user.birthDate,
      gender: user.gender,
      schoolInfo: user.schoolInfo,
      introduce: user.introduce,
      mbti: user.mbti,
      createdAt: user.createdAt,
    };
  }
}
