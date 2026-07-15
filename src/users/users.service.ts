import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { UpdateMeDto } from './dto/update-me.dto';
import { USER_ERROR_MESSAGES } from './user.constants';
import { UpdateMePatch, UserRepository } from './users.repository';
import { AuthProvider, UserGender, Mbti, CreateSocialUserProps } from './types/user.type';
import { UpdateResult } from 'typeorm';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly s3Service: S3Service,
  ) {}

  async findAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async createUser(params: {
    email: string;
    birthDate: string;
    gender: 'MALE' | 'FEMALE';
    name: string;
    nickname: string;
    hashedPassword: string;
    schoolInfo: string;
    introduce: string | null;
    mbti: string | null;
  }): Promise<User> {
    return this.userRepository.createUser(params);
  }

  async createSocialUser(params: CreateSocialUserProps): Promise<User> {
    return await this.userRepository.createSocialUser(params);
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.userRepository.existsByEmail(email);

    if (existingUser) {
      throw new ConflictException(USER_ERROR_MESSAGES.emailAlreadyExists);
    }
  }

  async existsByEmail(email: string): Promise<boolean> {
    return await this.userRepository.existsByEmail(email);
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

    if (
      updateMeDto.profileImageUrl !== undefined &&
      !this.s3Service.isS3Url(updateMeDto.profileImageUrl)
    ) {
      throw new BadRequestException(USER_ERROR_MESSAGES.invalidProfileImageUrl);
    }

    const patch = this.toUpdateMePatch(user, updateMeDto);

    if (patch.nickname !== undefined) {
      await this.assertNicknameAvailable(patch.nickname, userId);
    }

    if (Object.keys(patch).length === 0) {
      return user;
    }

    await this.userRepository.updateMe(userId, patch);

    if (patch.profileImageUrl !== undefined && user.profileImageUrl) {
      await this.s3Service.deleteImage(user.profileImageUrl);
    }

    return this.findActiveUserOrFail(userId);
  }

  async withdraw(userId: number): Promise<void> {
    await this.findActiveUserOrFail(userId);
    await this.revokeTokens(userId);
    await this.userRepository.softDelete(userId);
  }

  async findByProviderId(provider: AuthProvider, providerId: string): Promise<User | null> {
    return await this.userRepository.findByProviderId(provider, providerId);
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return await this.userRepository.findByNickname(nickname);
  }

  async updateProviderToken(
    userId: number,
    providerAccessToken: string,
    providerRefreshToken: string,
  ): Promise<UpdateResult> {
    return await this.userRepository.updateProviderToken(
      userId,
      providerAccessToken,
      providerRefreshToken,
    );
  }

  private toUpdateMePatch(user: User, updateMeDto: UpdateMeDto): UpdateMePatch {
    const patch: UpdateMePatch = {};

    if (updateMeDto.nickname !== undefined && updateMeDto.nickname !== user.nickname) {
      patch.nickname = updateMeDto.nickname;
    }

    if (updateMeDto.birthDate !== undefined && updateMeDto.birthDate !== user.birthDate) {
      patch.birthDate = updateMeDto.birthDate;
    }

    if (
      updateMeDto.gender !== undefined &&
      UserGender[updateMeDto.gender] !== UserGender[user.gender]
    ) {
      patch.gender = UserGender[updateMeDto.gender];
    }

    if (updateMeDto.schoolInfo !== undefined && updateMeDto.schoolInfo !== user.schoolInfo) {
      patch.schoolInfo = updateMeDto.schoolInfo;
    }

    if (updateMeDto.introduce !== undefined && updateMeDto.introduce !== user.introduce) {
      patch.introduce = updateMeDto.introduce;
    }

    if (updateMeDto.mbti !== undefined && updateMeDto.mbti !== user.mbti) {
      patch.mbti = Mbti[updateMeDto.mbti as Mbti];
    }

    if (
      updateMeDto.profileImageUrl !== undefined &&
      updateMeDto.profileImageUrl !== user.profileImageUrl
    ) {
      patch.profileImageUrl = updateMeDto.profileImageUrl;
    }

    return patch;
  }
}
