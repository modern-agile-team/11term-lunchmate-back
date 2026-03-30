import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '../users/users.service';
import { FriendListItemResponseDto } from './dto/friend-list-item-response.dto';
import { FriendListResponseDto } from './dto/friend-list-response.dto';
import { Friend, FriendStatus } from './entities/friend.entity';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { FriendRepository } from './friends.repository';

@Injectable()
export class FriendService {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly userService: UserService,
  ) {}

  async createRequest(requesterId: number, receiverId: number): Promise<FriendRequestResponseDto> {
    await this.validateReceiver(requesterId, receiverId);
    await this.ensureRequestableRelation(requesterId, receiverId);

    const friendRequest = await this.friendRepository.createOrRestoreRequest(
      requesterId,
      receiverId,
    );

    return this.toResponse(friendRequest);
  }

  async acceptRequest(
    currentUserId: number,
    friendshipId: number,
  ): Promise<FriendRequestResponseDto> {
    const friendRequest = await this.findRequestOrFail(friendshipId);
    this.ensureReceiverOwnsRequest(friendRequest, currentUserId);
    this.ensurePendingRequest(friendRequest);

    const acceptedRequest = await this.friendRepository.updateStatus(
      friendRequest,
      FriendStatus.ACCEPTED,
    );

    return this.toResponse(acceptedRequest);
  }

  async rejectRequest(
    currentUserId: number,
    friendshipId: number,
  ): Promise<FriendRequestResponseDto> {
    const friendRequest = await this.findRequestOrFail(friendshipId);
    this.ensureReceiverOwnsRequest(friendRequest, currentUserId);
    this.ensurePendingRequest(friendRequest);

    const rejectedRequest = await this.friendRepository.updateStatus(
      friendRequest,
      FriendStatus.REJECTED,
    );

    return this.toResponse(rejectedRequest);
  }

  async cancelRequest(currentUserId: number, friendshipId: number): Promise<void> {
    const friendRequest = await this.findRequestOrFail(friendshipId);
    this.ensureRequesterOwnsRequest(friendRequest, currentUserId);
    this.ensurePendingRequest(friendRequest);

    await this.friendRepository.softDelete(friendRequest.id);
  }

  async findFriends(currentUserId: number, status?: 'accepted'): Promise<FriendListResponseDto> {
    this.validateFriendListStatus(status);

    const relations = await this.friendRepository.findAcceptedRelationsForUser(currentUserId);

    return {
      items: relations.map((relation) => this.toFriendListItem(relation, currentUserId)),
    };
  }

  private async validateReceiver(requesterId: number, receiverId: number): Promise<void> {
    if (requesterId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself.');
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
      throw new ConflictException('Friend request already exists.');
    }

    const reverseRelation = existingRelations.find(
      (relation) => relation.requester.id === receiverId && relation.receiver.id === requesterId,
    );

    if (reverseRelation?.status === FriendStatus.PENDING) {
      throw new ConflictException('Friend request from the target user already exists.');
    }

    if (reverseRelation?.status === FriendStatus.ACCEPTED) {
      throw new ConflictException('Already friends.');
    }
  }

  private async findRequestOrFail(friendshipId: number): Promise<Friend> {
    const friendRequest = await this.friendRepository.findById(friendshipId);

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found.');
    }

    return friendRequest;
  }

  private ensureReceiverOwnsRequest(friendRequest: Friend, currentUserId: number): void {
    if (friendRequest.receiver.id !== currentUserId) {
      throw new ForbiddenException('Only the receiver can process this request.');
    }
  }

  private ensureRequesterOwnsRequest(friendRequest: Friend, currentUserId: number): void {
    if (friendRequest.requester.id !== currentUserId) {
      throw new ForbiddenException('Only the requester can cancel this request.');
    }
  }

  private ensurePendingRequest(friendRequest: Friend): void {
    if (friendRequest.status !== FriendStatus.PENDING) {
      throw new ConflictException('Friend request has already been processed.');
    }
  }

  private validateFriendListStatus(status?: 'accepted'): void {
    if (status && status !== 'accepted') {
      throw new BadRequestException('Only status=accepted is supported.');
    }
  }

  private toResponse(friend: Friend): FriendRequestResponseDto {
    return {
      id: friend.id,
      requesterId: friend.requester.id,
      receiverId: friend.receiver.id,
      status: friend.status,
      createdAt: friend.createdAt,
    };
  }

  private toFriendListItem(friend: Friend, currentUserId: number): FriendListItemResponseDto {
    const otherUser = friend.requester.id === currentUserId ? friend.receiver : friend.requester;

    return {
      friendshipId: friend.id,
      status: friend.status,
      user: this.userService.toPublicResponse(otherUser),
    };
  }
}
