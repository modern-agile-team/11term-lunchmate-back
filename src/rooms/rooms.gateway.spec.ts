import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { JwtAccessPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RoomGateway } from './rooms.gateway';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
};

const mockAuthService = {
  verifyAccessToken: jest.fn(),
};

const mockJwtAccessPayload: JwtAccessPayload = {
  sub: 1,
  email: 'test@gmail.com',
  nickname: '테스트',
  tokenVersion: 1,
  tokenId: 'token-id',
  type: 'access',
};

type MockSocket = Pick<Socket, 'id' | 'handshake' | 'data' | 'join' | 'leave' | 'disconnect'>;

function createMockSocket(overrides?: Partial<MockSocket>): MockSocket {
  return {
    id: 'socket-id',
    handshake: {
      headers: {},
      auth: {},
    } as Socket['handshake'],
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

describe('RoomGateway', () => {
  let gateway: RoomGateway;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomGateway,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    gateway = module.get<RoomGateway>(RoomGateway);
  });

  describe('handleConnection', () => {
    it('Authorization 헤더의 Bearer 토큰으로 인증한다', async () => {
      const client = createMockSocket({
        handshake: {
          headers: {
            authorization: 'Bearer access-token',
          },
          auth: {},
        } as unknown as Socket['handshake'],
      });
      mockAuthService.verifyAccessToken.mockResolvedValue(mockJwtAccessPayload);

      await gateway.handleConnection(client as Socket);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('access-token');
      expect(client.data.user).toEqual(mockJwtAccessPayload);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Socket connected : ${client.id}, userId : ${mockJwtAccessPayload.sub}`,
      );
    });

    it('handshake.auth.token의 순수 토큰으로 인증한다', async () => {
      const client = createMockSocket({
        handshake: {
          headers: {},
          auth: {
            token: 'plain-access-token',
          },
        } as unknown as Socket['handshake'],
      });
      mockAuthService.verifyAccessToken.mockResolvedValue(mockJwtAccessPayload);

      await gateway.handleConnection(client as Socket);

      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('plain-access-token');
      expect(client.data.user).toEqual(mockJwtAccessPayload);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('토큰이 없으면 연결을 끊는다', async () => {
      const client = createMockSocket();

      await gateway.handleConnection(client as Socket);

      expect(mockAuthService.verifyAccessToken).not.toHaveBeenCalled();
      expect(client.disconnect).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('토큰 검증에 실패하면 연결을 끊는다', async () => {
      const client = createMockSocket({
        handshake: {
          headers: {
            authorization: 'Bearer invalid-token',
          },
          auth: {},
        } as unknown as Socket['handshake'],
      });
      mockAuthService.verifyAccessToken.mockRejectedValue(new UnauthorizedException());

      await gateway.handleConnection(client as Socket);

      expect(client.disconnect).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('handleJoinRoom', () => {
    it('인증되지 않은 소켓이면 연결을 끊는다', () => {
      const client = createMockSocket({
        data: {},
      });

      gateway.handleJoinRoom({ roomId: 1 }, client as Socket);

      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('roomId가 올바르지 않으면 예외를 던진다', () => {
      const client = createMockSocket({
        data: {
          user: mockJwtAccessPayload,
        },
      });

      expect(() => gateway.handleJoinRoom({ roomId: 0 }, client as Socket)).toThrow(
        '방 번호가 올바르지 않습니다.',
      );
      expect(client.join).not.toHaveBeenCalled();
    });

    it('인증된 소켓은 방 채널에 참가한다', () => {
      const client = createMockSocket({
        data: {
          user: mockJwtAccessPayload,
        },
      });

      gateway.handleJoinRoom({ roomId: 191 }, client as Socket);

      expect(client.join).toHaveBeenCalledWith('room:191');
      expect(mockLogger.info).toHaveBeenCalledWith(`Socket ${client.id} joined room:191`);
    });
  });

  describe('handleLeaveRoom', () => {
    it('인증된 소켓은 방 채널에서 나간다', () => {
      const client = createMockSocket({
        data: {
          user: mockJwtAccessPayload,
        },
      });

      gateway.handleLeaveRoom({ roomId: 191 }, client as Socket);

      expect(client.leave).toHaveBeenCalledWith('room:191');
      expect(mockLogger.info).toHaveBeenCalledWith(`Socket ${client.id} left room:191`);
    });
  });

  describe('emitMembersUpdated', () => {
    it('방 채널에 멤버 변경 이벤트를 전송한다', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as unknown as RoomGateway['server'];

      gateway.emitMembersUpdated(191);

      expect(to).toHaveBeenCalledWith('room:191');
      expect(emit).toHaveBeenCalledWith('room.members_updated', { roomId: 191 });
    });
  });

  describe('emitRoomDeleted', () => {
    it('방 채널에 방 삭제 이벤트를 전송한다', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as unknown as RoomGateway['server'];

      gateway.emitRoomDeleted(191);

      expect(to).toHaveBeenCalledWith('room:191');
      expect(emit).toHaveBeenCalledWith('room.deleted', { roomId: 191 });
    });
  });
});
