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
    name: string;
    nickname: string;
    hashedPassword: string;
    profileImageUrl: string | null;
    bio: string | null;
    mbti: string | null;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: params.email,
      name: params.name,
      nickname: params.nickname,
      hashedPassword: params.hashedPassword,
      profileImageUrl: params.profileImageUrl,
      bio: params.bio,
      mbti: params.mbti,
      refreshTokenHash: null,
      tokenVersion: 0,
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

  async findByEmailForLogin(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.hashedPassword',
        'user.tokenVersion',
      ])
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdForRefresh(userId: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.refreshTokenHash',
        'user.tokenVersion',
      ])
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async findByIdForAccessValidation(userId: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.tokenVersion'])
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async updateRefreshTokenHash(
    userId: number,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      refreshTokenHash,
    });
  }

  async rotateRefreshTokenHash(
    userId: number,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
  ): Promise<boolean> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        refreshTokenHash: nextRefreshTokenHash,
      })
      .where('id = :userId', { userId })
      .andWhere('"refresh_token_hash" = :currentRefreshTokenHash', {
        currentRefreshTokenHash,
      })
      .execute();

    return (result.affected ?? 0) === 1;
  }

  async revokeTokens(userId: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        refreshTokenHash: null,
        tokenVersion: () => '"token_version" + 1',
      })
      .where('id = :userId', { userId })
      .execute();
  }

  toMeResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      bio: user.bio,
      mbti: user.mbti,
      createdAt: user.createdAt,
    };
  }
}
