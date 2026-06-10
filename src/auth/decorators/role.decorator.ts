import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../auth.constants';
import { UserRole } from 'src/users/types/user.type';

export const Roles = (...roles: UserRole[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
