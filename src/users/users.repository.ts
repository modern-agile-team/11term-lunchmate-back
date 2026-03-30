import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
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

  async existsByEmail(email: string): Promise<boolean> {
    return this.userRepository.exists({
      where: { email },
    });
  }

  async existsByNickname(nickname: string): Promise<boolean> {
    return this.userRepository.exists({
      where: { nickname },
    });
  }
}
