import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Friend, FriendStatus } from './entities/friend.entity';

@Injectable()
export class FriendRepository {
  constructor(
    @InjectRepository(Friend)
    private readonly friendRepository: Repository<Friend>,
  ) {}

  async findActiveRelationsBetweenUsers(userId: number, otherUserId: number): Promise<Friend[]> {
    // Bidirectional requester/receiver matching still needs query builder.
    return this.createRelationQuery()
      .where(
        '(requester.id = :userId AND receiver.id = :otherUserId) OR (requester.id = :otherUserId AND receiver.id = :userId)',
        { userId, otherUserId },
      )
      .getMany();
  }

  async findAcceptedRelationsForUser(userId: number): Promise<Friend[]> {
    // Friend list lookup combines joined users with OR filtering on both sides.
    return this.createRelationQuery()
      .where('(requester.id = :userId OR receiver.id = :userId)', { userId })
      .andWhere('friend.status = :status', { status: FriendStatus.ACCEPTED })
      .getMany();
  }

  async findRestorableRequest(requesterId: number, receiverId: number): Promise<Friend | null> {
    // Restorable lookup needs withDeleted plus joined requester/receiver filtering.
    return this.createRelationQuery({ withDeleted: true })
      .where('requester.id = :requesterId', { requesterId })
      .andWhere('receiver.id = :receiverId', { receiverId })
      .andWhere('friend.deleted_at IS NOT NULL')
      .getOne();
  }

  async findById(friendId: number): Promise<Friend | null> {
    return this.findByIdWithRepository(this.friendRepository, friendId);
  }

  async createOrRestoreRequest(requesterId: number, receiverId: number): Promise<Friend> {
    return this.friendRepository.manager.transaction(async (manager) => {
      const scopedRepository = manager.getRepository(Friend);
      const restorableRequest = await this.findRestorableRequestWithRepository(
        scopedRepository,
        requesterId,
        receiverId,
      );

      if (restorableRequest) {
        await scopedRepository.restore(restorableRequest.id);
        await scopedRepository.update(restorableRequest.id, {
          status: FriendStatus.PENDING,
        });

        return this.reloadByIdOrFail(scopedRepository, restorableRequest.id);
      }

      return this.createRequestAndReload(scopedRepository, requesterId, receiverId);
    });
  }

  async updateStatus(friendId: number, status: FriendStatus): Promise<Friend> {
    await this.friendRepository.update(friendId, { status });
    return this.reloadByIdOrFail(this.friendRepository, friendId);
  }

  async softDelete(friendId: number): Promise<void> {
    await this.friendRepository.softDelete(friendId);
  }

  private createRelationQuery(options?: { withDeleted?: boolean }): SelectQueryBuilder<Friend> {
    const queryBuilder = this.friendRepository
      .createQueryBuilder('friend')
      .leftJoinAndSelect('friend.requester', 'requester')
      .leftJoinAndSelect('friend.receiver', 'receiver');

    if (options?.withDeleted) {
      queryBuilder.withDeleted();
    }

    return queryBuilder;
  }

  private async createRequestAndReload(
    repository: Repository<Friend>,
    requesterId: number,
    receiverId: number,
  ): Promise<Friend> {
    const friendRequest = repository.create({
      requester: { id: requesterId } as User,
      receiver: { id: receiverId } as User,
      status: FriendStatus.PENDING,
    });
    const savedRequest = await repository.save(friendRequest);

    return this.reloadByIdOrFail(repository, savedRequest.id);
  }

  private async findRestorableRequestWithRepository(
    repository: Repository<Friend>,
    requesterId: number,
    receiverId: number,
  ): Promise<Friend | null> {
    return repository
      .createQueryBuilder('friend')
      .withDeleted()
      .leftJoinAndSelect('friend.requester', 'requester')
      .leftJoinAndSelect('friend.receiver', 'receiver')
      .where('requester.id = :requesterId', { requesterId })
      .andWhere('receiver.id = :receiverId', { receiverId })
      .andWhere('friend.deleted_at IS NOT NULL')
      .getOne();
  }

  private async findByIdWithRepository(
    repository: Repository<Friend>,
    friendId: number,
  ): Promise<Friend | null> {
    return repository
      .createQueryBuilder('friend')
      .leftJoinAndSelect('friend.requester', 'requester')
      .leftJoinAndSelect('friend.receiver', 'receiver')
      .where('friend.id = :friendId', { friendId })
      .getOne();
  }

  private async reloadByIdOrFail(
    repository: Repository<Friend>,
    friendId: number,
  ): Promise<Friend> {
    const friend = await this.findByIdWithRepository(repository, friendId);

    if (!friend) {
      throw new Error(`Friend ${friendId} was written but could not be reloaded.`);
    }

    return friend;
  }
}
