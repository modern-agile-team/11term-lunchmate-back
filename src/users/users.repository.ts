import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export type UpdateMePatch = Partial<
  Pick<User, 'nickname' | 'birthDate' | 'gender' | 'schoolInfo' | 'introduce' | 'mbti'>
>;

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

  async existsByNicknameExcludingUser(nickname: string, excludeUserId: number): Promise<boolean> {
    const existingUser = await this.userRepository.findOne({
      select: {
        id: true,
      },
      where: {
        nickname,
      },
      withDeleted: false,
    });

    return !!existingUser && existingUser.id !== excludeUserId;
  }

  async findByEmailForLogin(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.hashedPassword', 'user.tokenVersion'])
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdForRefresh(userId: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.refreshTokenHash', 'user.tokenVersion'])
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

  async updateRefreshTokenHash(userId: number, refreshTokenHash: string | null): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash });
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

  async findActiveUserById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        id: userId,
      },
    });
  }

  async updateMe(userId: number, patch: UpdateMePatch): Promise<void> {
    await this.userRepository.update(userId, patch);
  }

  async softDelete(userId: number): Promise<void> {
    await this.userRepository.softDelete(userId);
  }
}
