import { applyDecorators, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';

export function OptionalAuthenticated() {
  return applyDecorators(UseGuards(OptionalJwtAuthGuard));
}
