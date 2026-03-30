import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { MeUserResponseDto } from './dto/me-user-response.dto';
import { PublicUserResponseDto } from './dto/public-user-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';
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
    excludeUserId?: number,
  ): Promise<void> {
    const existingUser = excludeUserId
      ? await this.userRepository.existsByNicknameExcludingUser(
          nickname,
          excludeUserId,
        )
      : await this.userRepository.existsByNickname(nickname);

    if (existingUser) {
      throw new ConflictException('Nickname already exists.');
    }
  }

  async findByEmailForLogin(email: string): Promise<User | null> {
    return this.userRepository.findByEmailForLogin(email);
  }

  async findByIdForRefresh(userId: number): Promise<User | null> {
    return this.userRepository.findByIdForRefresh(userId);
  }

  async findByIdForAccessValidation(userId: number): Promise<User | null> {
    return this.userRepository.findByIdForAccessValidation(userId);
  }

  async updateRefreshTokenHash(
    userId: number,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userRepository.updateRefreshTokenHash(userId, refreshTokenHash);
  }

  async rotateRefreshTokenHash(
    userId: number,
    currentRefreshTokenHash: string,
    nextRefreshTokenHash: string,
  ): Promise<boolean> {
    return this.userRepository.rotateRefreshTokenHash(
      userId,
      currentRefreshTokenHash,
      nextRefreshTokenHash,
    );
  }

  async revokeTokens(userId: number): Promise<void> {
    await this.userRepository.revokeTokens(userId);
  }

  async findActiveUserOrFail(userId: number): Promise<User> {
    const user = await this.userRepository.findActiveUserById(userId);

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

    user.nickname = updateMeDto.nickname ?? user.nickname;
    user.birthDate = updateMeDto.birthDate ?? user.birthDate;
    user.gender = updateMeDto.gender ?? user.gender;
    user.schoolInfo = updateMeDto.schoolInfo ?? user.schoolInfo;
    user.introduce = updateMeDto.introduce ?? user.introduce;
    user.mbti = updateMeDto.mbti ?? user.mbti;

    const savedUser = await this.userRepository.save(user);
    return this.toMeResponse(savedUser);
  }

  async withdraw(userId: number): Promise<void> {
    await this.findActiveUserOrFail(userId);
    await this.revokeTokens(userId);
    await this.userRepository.softDelete(userId);
  }

  toPublicResponse(user: User): PublicUserResponseDto {
    return {
      id: user.id,
      nickname: user.nickname,
      birthDate: user.birthDate,
      gender: user.gender,
      schoolInfo: user.schoolInfo,
      introduce: user.introduce,
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
