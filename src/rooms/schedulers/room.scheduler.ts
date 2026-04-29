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
    const closedRoomIds = await this.roomService.closeExpiredRooms();

    if (closedRoomIds.length > 0) {
      this.logger.info(`Closed rooms : ${closedRoomIds.join(', ')}`);
    }
  }
}
