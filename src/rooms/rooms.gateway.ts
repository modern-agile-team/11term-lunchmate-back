import { BadRequestException, Inject, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { Logger } from 'winston';
import { extractAccessToken } from 'src/auth/utils/token.util';

type JoinRoomPayload = {
  roomId: number;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly authService: AuthService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      const tokenFromHeader = client.handshake.headers.authorization;
      const tokenFromAuth = client.handshake.auth.token;

      const rawToken =
        typeof tokenFromHeader === 'string'
          ? tokenFromHeader
          : typeof tokenFromAuth === 'string'
            ? tokenFromAuth
            : null;

      if (!rawToken) throw new UnauthorizedException();

      const accessToken = extractAccessToken(rawToken);

      const payload = await this.authService.verifyAccessToken(accessToken);

      client.data.user = payload;
      this.logger.info(`Socket connected : ${client.id}, userId : ${payload.sub}`);
    } catch (error: unknown) {
      if (error instanceof Error) this.logger.warn(`Socket authentication failed ${error.message}`);
      else this.logger.warn('Socket authentication failed');

      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.info(`Socket disconnected : ${client.id}`);
  }

  @SubscribeMessage('room.join')
  handleJoinRoom(@MessageBody() payload: JoinRoomPayload, @ConnectedSocket() client: Socket) {
    if (!client.data.user) {
      client.disconnect();
      return;
    }

    if (!payload.roomId || typeof payload.roomId !== 'number')
      throw new BadRequestException('방 번호가 올바르지 않습니다.');

    const roomChannel = this.getRoomChannel(payload.roomId);
    client.join(roomChannel);

    this.logger.info(`Socket ${client.id} joined ${roomChannel}`);
  }

  @SubscribeMessage(`room.leave`)
  handleLeaveRoom(@MessageBody() payload: JoinRoomPayload, @ConnectedSocket() client: Socket) {
    if (!client.data.user) {
      client.disconnect();
      return;
    }

    if (!payload.roomId || typeof payload.roomId !== 'number')
      throw new BadRequestException('방 번호가 올바르지 않습니다.');

    const roomChannel = this.getRoomChannel(payload.roomId);
    client.leave(roomChannel);

    this.logger.info(`Socket ${client.id} left ${roomChannel}`);
  }

  emitMembersUpdated(roomId: number) {
    const roomChannel = this.getRoomChannel(roomId);

    this.server.to(roomChannel).emit('room.members_updated', {
      roomId,
    });
  }

  emitRoomDeleted(roomId: number) {
    const roomChannel = this.getRoomChannel(roomId);

    this.server.to(roomChannel).emit('room.deleted', {
      roomId,
    });
  }

  private getRoomChannel(roomId: number): string {
    return `room:${roomId}`;
  }
}
