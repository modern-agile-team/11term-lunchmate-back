import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UpdateMeDto } from './dto/update-me.dto';
import { USER_ERROR_MESSAGES } from './user.constants';
import { UpdateMePatch, UserRepository } from './users.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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
      throw new ConflictException(USER_ERROR_MESSAGES.emailAlreadyExists);
    }
  }

  async assertNicknameAvailable(nickname: string, excludeUserId?: number): Promise<void> {
    const existingUser = excludeUserId
      ? await this.userRepository.existsByNicknameExcludingUser(nickname, excludeUserId)
      : await this.userRepository.existsByNickname(nickname);

    if (existingUser) {
      throw new ConflictException(USER_ERROR_MESSAGES.nicknameAlreadyExists);
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

  async updateRefreshTokenHash(userId: number, refreshTokenHash: string | null): Promise<void> {
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
      throw new NotFoundException(USER_ERROR_MESSAGES.userNotFound);
    }

    return user;
  }

  async findPublicUserById(userId: number): Promise<User> {
    return this.findActiveUserOrFail(userId);
  }

  async findMe(userId: number): Promise<User> {
    return this.findActiveUserOrFail(userId);
  }

  async updateMe(userId: number, updateMeDto: UpdateMeDto): Promise<User> {
    const user = await this.findActiveUserOrFail(userId);
    const patch = this.toUpdateMePatch(user, updateMeDto);

    if (patch.nickname !== undefined) {
      await this.assertNicknameAvailable(patch.nickname, userId);
    }

    if (Object.keys(patch).length === 0) {
      return user;
    }

    await this.userRepository.updateMe(userId, patch);

    return this.findActiveUserOrFail(userId);
  }

  async withdraw(userId: number): Promise<void> {
    await this.findActiveUserOrFail(userId);
    await this.revokeTokens(userId);
    await this.userRepository.softDelete(userId);
  }

  private toUpdateMePatch(user: User, updateMeDto: UpdateMeDto): UpdateMePatch {
    const patch: UpdateMePatch = {};

    if (updateMeDto.nickname !== undefined && updateMeDto.nickname !== user.nickname) {
      patch.nickname = updateMeDto.nickname;
    }

    if (updateMeDto.birthDate !== undefined && updateMeDto.birthDate !== user.birthDate) {
      patch.birthDate = updateMeDto.birthDate;
    }

    if (updateMeDto.gender !== undefined && updateMeDto.gender !== user.gender) {
      patch.gender = updateMeDto.gender;
    }

    if (updateMeDto.schoolInfo !== undefined && updateMeDto.schoolInfo !== user.schoolInfo) {
      patch.schoolInfo = updateMeDto.schoolInfo;
    }

    if (updateMeDto.introduce !== undefined && updateMeDto.introduce !== user.introduce) {
      patch.introduce = updateMeDto.introduce;
    }

    if (updateMeDto.mbti !== undefined && updateMeDto.mbti !== user.mbti) {
      patch.mbti = updateMeDto.mbti;
    }

    return patch;
  }
}
