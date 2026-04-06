export const FRIEND_ERROR_MESSAGES = {
  cannotRequestSelf: 'Cannot send friend request to yourself.',
  requestNotFound: 'Friend request not found.',
  requestAlreadyExists: 'Friend request already exists.',
  reversePendingExists: 'Friend request from the target user already exists.',
  alreadyFriends: 'Already friends.',
  receiverOnly: 'Only the receiver can process this request.',
  requesterOnly: 'Only the requester can cancel this request.',
  alreadyProcessed: 'Friend request has already been processed.',
  acceptedOnly: 'Only accepted friends can be deleted.',
  relatedUsersOnly: 'Only related users can delete this friendship.',
  acceptedStatusOnly: 'Only status=accepted is supported.',
} as const;
