import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../users/users.service';
import { FRIEND_ERROR_MESSAGES } from './friend.constants';
import { Friend, FriendStatus } from './entities/friend.entity';
import { FriendRepository } from './friends.repository';

@Injectable()
export class FriendService {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly userService: UserService,
  ) {}

  async createRequest(requesterId: number, receiverId: number): Promise<Friend> {
    await this.validateReceiver(requesterId, receiverId);
    await this.ensureRequestableRelation(requesterId, receiverId);

    return this.friendRepository.createOrRestoreRequest(
      requesterId,
      receiverId,
    );
  }

  async acceptRequest(currentUserId: number, friendshipId: number): Promise<Friend> {
    const friendRequest = await this.findRequestOrFail(friendshipId);
    this.ensureReceiverOwnsRequest(friendRequest, currentUserId);
    this.ensurePendingRequest(friendRequest);

    return this.friendRepository.updateStatus(
      friendRequest,
      FriendStatus.ACCEPTED,
    );
  }

  async rejectRequest(currentUserId: number, friendshipId: number): Promise<Friend> {
    const friendRequest = await this.findRequestOrFail(friendshipId);
    this.ensureReceiverOwnsRequest(friendRequest, currentUserId);
    this.ensurePendingRequest(friendRequest);

    return this.friendRepository.updateStatus(
      friendRequest,
      FriendStatus.REJECTED,
    );
  }

  async cancelRequest(currentUserId: number, friendshipId: number): Promise<void> {
    const friendRequest = await this.findRequestOrFail(friendshipId);
    this.ensureRequesterOwnsRequest(friendRequest, currentUserId);
    this.ensurePendingRequest(friendRequest);

    await this.friendRepository.softDelete(friendRequest.id);
  }

  async deleteFriend(currentUserId: number, friendshipId: number): Promise<void> {
    const friendRelation = await this.findRequestOrFail(friendshipId);
    this.ensureUserRelatedToFriend(friendRelation, currentUserId);
    this.ensureAcceptedFriend(friendRelation);

    await this.friendRepository.softDelete(friendRelation.id);
  }

  async findFriends(currentUserId: number, status?: 'accepted'): Promise<Friend[]> {
    this.validateFriendListStatus(status);
    return this.friendRepository.findAcceptedRelationsForUser(currentUserId);
  }

  private async validateReceiver(requesterId: number, receiverId: number): Promise<void> {
    if (requesterId === receiverId) {
      throw new BadRequestException(FRIEND_ERROR_MESSAGES.cannotRequestSelf);
    }

    await this.userService.findActiveUserOrFail(receiverId);
  }

  private async ensureRequestableRelation(requesterId: number, receiverId: number): Promise<void> {
    const existingRelations = await this.friendRepository.findActiveRelationsBetweenUsers(
      requesterId,
      receiverId,
    );

    const sameDirectionRelation = existingRelations.find(
      (relation) => relation.requester.id === requesterId && relation.receiver.id === receiverId,
    );

    if (sameDirectionRelation) {
      throw new ConflictException(FRIEND_ERROR_MESSAGES.requestAlreadyExists);
    }

    const reverseRelation = existingRelations.find(
      (relation) => relation.requester.id === receiverId && relation.receiver.id === requesterId,
    );

    if (reverseRelation?.status === FriendStatus.PENDING) {
      throw new ConflictException(FRIEND_ERROR_MESSAGES.reversePendingExists);
    }

    if (reverseRelation?.status === FriendStatus.ACCEPTED) {
      throw new ConflictException(FRIEND_ERROR_MESSAGES.alreadyFriends);
    }
  }

  private async findRequestOrFail(friendshipId: number): Promise<Friend> {
    const friendRequest = await this.friendRepository.findById(friendshipId);

    if (!friendRequest) {
      throw new NotFoundException(FRIEND_ERROR_MESSAGES.requestNotFound);
    }

    return friendRequest;
  }

  private ensureReceiverOwnsRequest(friendRequest: Friend, currentUserId: number): void {
    if (friendRequest.receiver.id !== currentUserId) {
      throw new ForbiddenException(FRIEND_ERROR_MESSAGES.receiverOnly);
    }
  }

  private ensureRequesterOwnsRequest(friendRequest: Friend, currentUserId: number): void {
    if (friendRequest.requester.id !== currentUserId) {
      throw new ForbiddenException(FRIEND_ERROR_MESSAGES.requesterOnly);
    }
  }

  private ensurePendingRequest(friendRequest: Friend): void {
    if (friendRequest.status !== FriendStatus.PENDING) {
      throw new ConflictException(FRIEND_ERROR_MESSAGES.alreadyProcessed);
    }
  }

  private ensureAcceptedFriend(friend: Friend): void {
    if (friend.status !== FriendStatus.ACCEPTED) {
      throw new ConflictException(FRIEND_ERROR_MESSAGES.acceptedOnly);
    }
  }

  private ensureUserRelatedToFriend(friend: Friend, currentUserId: number): void {
    if (friend.requester.id !== currentUserId && friend.receiver.id !== currentUserId) {
      throw new ForbiddenException(FRIEND_ERROR_MESSAGES.relatedUsersOnly);
    }
  }

  private validateFriendListStatus(status?: 'accepted'): void {
    if (status && status !== 'accepted') {
      throw new BadRequestException(FRIEND_ERROR_MESSAGES.acceptedStatusOnly);
    }
  }
}
