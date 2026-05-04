import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RoomService } from '../rooms.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RoomScheduler {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly roomService: RoomService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredRooms() {
    try {
      const expiredRoomIds = await this.roomService.findExpiredRooms();

      if (expiredRoomIds.length > 0) {
        const closedRoomIds = await this.roomService.closeExpiredRooms(expiredRoomIds);

        this.logger.info(`Closed rooms : ${closedRoomIds.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Failed to close expired rooms.`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
