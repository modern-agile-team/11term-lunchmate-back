import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Not, Repository } from 'typeorm';
import { MeUserResponseDto } from './dto/me-user-response.dto';
import { PublicUserResponseDto } from './dto/public-user-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
    excludeUserId?: number,
  ): Promise<void> {
    const existingUser = await this.userRepository.exists({
      where: excludeUserId
        ? {
            nickname,
            id: Not(excludeUserId),
          }
        : {
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

  async findActiveUserOrFail(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async findPublicUserById(userId: number): Promise<PublicUserResponseDto> {
    const user = await this.findActiveUserOrFail(userId);
    return this.toPublicResponse(user);
  }

  async findMe(userId: number): Promise<MeUserResponseDto> {
    const user = await this.findActiveUserOrFail(userId);
    return this.toMeResponse(user);
  }

  async updateMe(
    userId: number,
    updateMeDto: UpdateMeDto,
  ): Promise<MeUserResponseDto> {
    const user = await this.findActiveUserOrFail(userId);

    if (updateMeDto.nickname) {
      await this.assertNicknameAvailable(updateMeDto.nickname, userId);
    }

    user.name = updateMeDto.name ?? user.name;
    user.nickname = updateMeDto.nickname ?? user.nickname;
    user.profileImageUrl = updateMeDto.profileImageUrl ?? user.profileImageUrl;
    user.bio = updateMeDto.bio ?? user.bio;
    user.mbti = updateMeDto.mbti ?? user.mbti;

    const savedUser = await this.userRepository.save(user);
    return this.toMeResponse(savedUser);
  }

  toPublicResponse(user: User): PublicUserResponseDto {
    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      bio: user.bio,
      mbti: user.mbti,
      createdAt: user.createdAt,
    };
  }

  toMeResponse(user: User): MeUserResponseDto {
    return {
      ...this.toPublicResponse(user),
      email: user.email,
    };
  }
}
