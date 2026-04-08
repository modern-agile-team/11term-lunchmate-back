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
    return this.friendRepository.findOne({
      where: { id: friendId },
      relations: {
        requester: true,
        receiver: true,
      },
    });
  }

  async createOrRestoreRequest(requesterId: number, receiverId: number): Promise<Friend> {
    const restorableRequest = await this.findRestorableRequest(requesterId, receiverId);

    if (restorableRequest) {
      return this.restoreRequest(restorableRequest);
    }

    return this.createNewRequest(requesterId, receiverId);
  }

  private async restoreRequest(friendRequest: Friend): Promise<Friend> {
    await this.friendRepository.restore(friendRequest.id);
    friendRequest.status = FriendStatus.PENDING;
    return this.persistAndReload(friendRequest);
  }

  private async createNewRequest(requesterId: number, receiverId: number): Promise<Friend> {
    const friendRequest = this.friendRepository.create({
      requester: { id: requesterId } as User,
      receiver: { id: receiverId } as User,
      status: FriendStatus.PENDING,
    });

    return this.persistAndReload(friendRequest);
  }

  async updateStatus(friendRequest: Friend, status: FriendStatus): Promise<Friend> {
    friendRequest.status = status;
    return this.persistAndReload(friendRequest);
  }

  async softDelete(friendId: number): Promise<void> {
    await this.friendRepository.softDelete(friendId);
  }

  private createRelationQuery(options?: { withDeleted?: boolean }): SelectQueryBuilder<Friend> {
    const query = this.friendRepository
      .createQueryBuilder('friend')
      .leftJoinAndSelect('friend.requester', 'requester')
      .leftJoinAndSelect('friend.receiver', 'receiver');

    if (options?.withDeleted) {
      query.withDeleted();
    }

    return query;
  }

  private async persistAndReload(friendRequest: Friend): Promise<Friend> {
    const savedRequest = await this.friendRepository.save(friendRequest);
    return (await this.findById(savedRequest.id)) ?? savedRequest;
  }
}
