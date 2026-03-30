import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UserService } from '../users/users.service';
import { Friend, FriendStatus } from './entities/friend.entity';
import { FriendRequestResponseDto } from './dto/friend-request-response.dto';
import { FriendRepository } from './friends.repository';

@Injectable()
export class FriendService {
  constructor(
    private readonly friendRepository: FriendRepository,
    private readonly userService: UserService,
  ) {}

  async createRequest(
    requesterId: number,
    receiverId: number,
  ): Promise<FriendRequestResponseDto> {
    await this.validateReceiver(requesterId, receiverId);
    await this.ensureRequestableRelation(requesterId, receiverId);

    const friendRequest = await this.friendRepository.createOrRestoreRequest(
      requesterId,
      receiverId,
    );

    return this.toResponse(friendRequest);
  }

  private async validateReceiver(
    requesterId: number,
    receiverId: number,
  ): Promise<void> {
    if (requesterId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself.');
    }

    await this.userService.findActiveUserOrFail(receiverId);
  }

  private async ensureRequestableRelation(
    requesterId: number,
    receiverId: number,
  ): Promise<void> {
    const existingRelations =
      await this.friendRepository.findActiveRelationsBetweenUsers(
        requesterId,
        receiverId,
      );

    const sameDirectionRelation = existingRelations.find(
      (relation) =>
        relation.requester.id === requesterId &&
        relation.receiver.id === receiverId,
    );

    if (sameDirectionRelation) {
      throw new ConflictException('Friend request already exists.');
    }

    const reverseRelation = existingRelations.find(
      (relation) =>
        relation.requester.id === receiverId &&
        relation.receiver.id === requesterId,
    );

    if (reverseRelation?.status === FriendStatus.PENDING) {
      throw new ConflictException(
        'Friend request from the target user already exists.',
      );
    }

    if (reverseRelation?.status === FriendStatus.ACCEPTED) {
      throw new ConflictException('Already friends.');
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
}
