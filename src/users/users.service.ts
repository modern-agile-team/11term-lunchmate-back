import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find();
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
    const user = this.userRepository.create({
      email: params.email,
      birthDate: params.birthDate,
      gender: params.gender,
      nickname: params.nickname,
      hashedPassword: params.hashedPassword,
      schoolInfo: params.schoolInfo,
      introduce: params.introduce,
      mbti: params.mbti,
    });

    return this.userRepository.save(user);
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.userRepository.exists({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }
  }

  async assertNicknameAvailable(
    nickname: string,
  ): Promise<void> {
    const existingUser = await this.userRepository.exists({
      where: {
        nickname,
      },
    });

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
