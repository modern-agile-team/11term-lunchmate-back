import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/entities/user.entity';
import { ROLES_KEY } from '../auth.constants';

export const Roles = (...roles: UserRole[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
