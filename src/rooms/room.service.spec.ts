import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './rooms.service';
import { RoomRepository } from './room.repository';
import { DataSource, DeleteResult, EntityManager } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomStatus, RoomType } from './entities/room.entity';
import { PAGINATION_CONSTANTS } from './constants/room.constant';
import { RoomMemberService } from './roomMember.service';
import { UserService } from '../users/users.service';
import { RoomGateway } from './rooms.gateway';

const mockUserSummary = {
  id: 1,
  nickname: '임동영',
  gender: 'MALE' as const,
  schoolInfo: '인덕대',
};

const mockRoomEntity = {
  id: 1,
  title: '밥 같이 먹을 사람',
  description: '테스트용 방입니다.',
  roomType: RoomType.MALE,
  status: RoomStatus.OPEN,
  maxMembersCount: 4,
  currentMembersCount: 1,
  minAge: 20,
  maxAge: 24,
  place: '학식당 앞',
  lunchAt: '2099-03-27T03:30:00.000Z',
  createdAt: '2026-03-27T06:26:40.062Z',
  hostUserId: mockUserSummary.id,
  hostUser: mockUserSummary,
  roomMembers: [
    {
      id: 1,
      user: mockUserSummary,
    },
  ],
};

const { hostUser, ...roomEntityBase } = mockRoomEntity;
void hostUser;

const mockSecondRoomEntity = {
  ...mockRoomEntity,
  id: 2,
  title: '두 번째 방',
};

const createRoomDto: CreateRoomDto = {
  title: mockRoomEntity.title,
  description: mockRoomEntity.description,
  roomType: RoomType.MALE,
  maxMembersCount: mockRoomEntity.maxMembersCount,
  place: mockRoomEntity.place,
  lunchAt: mockRoomEntity.lunchAt,
  minAge: mockRoomEntity.minAge,
  maxAge: mockRoomEntity.maxAge,
};

const createRoomProps = {
  title: createRoomDto.title,
  description: createRoomDto.description,
  roomType: createRoomDto.roomType,
  maxMembersCount: createRoomDto.maxMembersCount,
  maxAge: createRoomDto.maxAge,
  minAge: createRoomDto.minAge,
  place: createRoomDto.place,
  lunchAt: createRoomDto.lunchAt,
  hostUser: { id: mockUserSummary.id },
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockManager = {
  save: jest.fn(),
} as unknown as EntityManager;

const mockRoomRepository = {
  createRoom: jest.fn(),
  findRoomById: jest.fn(),
  findRooms: jest.fn(),
  findJoinableRooms: jest.fn(),
  findExpiredOpenRooms: jest.fn(),
  closeRooms: jest.fn(),
  updateRoomStatusToComplete: jest.fn(),
  updateRoom: jest.fn(),
  deleteRoom: jest.fn(),
  increaseCurrentMembersCount: jest.fn(),
  decreaseCurrentMembersCount: jest.fn(),
  updateRoomHostUser: jest.fn(),
};

const mockRoomMemberService = {
  createRoomMember: jest.fn(),
  findParticipatingRoomByUserId: jest.fn(),
  findRoomMembersByRoomId: jest.fn(),
  findRoomMemberCount: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  isRoomMember: jest.fn(),
  findFirstJoinedMemberId: jest.fn(),
};

const mockUserService = {
  findMe: jest.fn(),
};

const mockRoomGateway = {
  emitMembersUpdated: jest.fn(),
  emitRoomDeleted: jest.fn(),
};

describe('RoomService', () => {
  let roomService: RoomService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-27T00:00:00.000Z'));
    jest.restoreAllMocks();
    jest.resetAllMocks();

    mockDataSource.transaction.mockImplementation(
      async <T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> => {
        return callback(mockManager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: RoomRepository,
          useValue: mockRoomRepository,
        },
        {
          provide: RoomMemberService,
          useValue: mockRoomMemberService,
        },
        {
          provide: RoomGateway,
          useValue: mockRoomGateway,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    roomService = module.get<RoomService>(RoomService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findRoomById', () => {
    it('ID에 해당하는 방의 정보를 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValue(mockRoomEntity);

      const result = await roomService.findRoomById(mockRoomEntity.id);

      expect(result).toEqual(mockRoomEntity);
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
    });

    it('존재하지 않는 방 ID로 조회하면 NotFoundException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValue(null);

      await expect(roomService.findRoomById(999)).rejects.toThrow(NotFoundException);

      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(999);
    });
  });

  describe('findRooms', () => {
    it('조건에 맞는 방 목록을 반환', async () => {
      const query: FindRoomsQueryDto = {
        roomType: RoomType.MALE,
        status: RoomStatus.OPEN,
        minAge: 20,
        maxAge: 24,
        lunchAtFrom: '2099-03-27T00:00:00.000Z',
        lunchAtTo: '2099-03-27T23:59:59.999Z',
      };

      mockRoomRepository.findRooms.mockResolvedValue([mockRoomEntity]);

      const result = await roomService.findRooms(query);

      expect(result).toEqual({
        items: [mockRoomEntity],
        nextCursor: null,
        hasNext: false,
      });
      expect(mockRoomRepository.findRooms).toHaveBeenCalledWith(query);
    });

    it('limit보다 많은 방이 조회되면 nextCursor와 hasNext를 반환', async () => {
      const query: FindRoomsQueryDto = {
        limit: 1,
      };
      const paginatedListDto = {
        items: [mockSecondRoomEntity],
        nextCursor: mockSecondRoomEntity.id,
        hasNext: true,
      };

      mockRoomRepository.findRooms.mockResolvedValue([mockSecondRoomEntity, mockRoomEntity]);

      const result = await roomService.findRooms(query);

      expect(result).toEqual(paginatedListDto);
      expect(mockRoomRepository.findRooms).toHaveBeenCalledWith(query);
    });

    it('limit이 없으면 기본 페이지 크기를 기준으로 페이징', async () => {
      const query: FindRoomsQueryDto = {};
      const rooms = Array.from({ length: PAGINATION_CONSTANTS.DEFAULT_LIMIT + 1 }, (_, index) => ({
        ...mockRoomEntity,
        id: PAGINATION_CONSTANTS.DEFAULT_LIMIT + 1 - index,
      }));

      mockRoomRepository.findRooms.mockResolvedValue(rooms);

      await expect(roomService.findRooms(query)).resolves.toEqual({
        items: rooms.slice(0, PAGINATION_CONSTANTS.DEFAULT_LIMIT),
        nextCursor: 2,
        hasNext: true,
      });
    });

    it('조회 시작 시간이 종료 시간보다 늦으면 BadRequestException을 반환', async () => {
      const query: FindRoomsQueryDto = {
        lunchAtFrom: '2099-03-27T14:00:00.000Z',
        lunchAtTo: '2099-03-27T12:00:00.000Z',
      };

      await expect(roomService.findRooms(query)).rejects.toThrow(BadRequestException);
      expect(mockRoomRepository.findRooms).not.toHaveBeenCalled();
    });
  });

  describe('createRoom', () => {
    it('방을 생성하고 생성된 방의 정보를 반환', async () => {
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.createRoomMember.mockResolvedValueOnce({
        room: { id: mockRoomEntity.id },
        user: { id: mockUserSummary.id },
      });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      const result = await roomService.createRoom(mockUserSummary.id, createRoomDto);

      expect(result).toEqual(mockRoomEntity);
      expect(mockRoomMemberService.findParticipatingRoomByUserId).toHaveBeenCalledWith(
        mockUserSummary.id,
        undefined,
      );
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(mockManager, createRoomProps);
      expect(mockRoomMemberService.createRoomMember).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        mockRoomEntity.id,
      );
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('이미 참여중인 방이 있는 사용자가 방을 생성하면 BadRequestException을 반환', async () => {
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce({ id: 99 });

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRoomRepository.createRoom).not.toHaveBeenCalled();
      expect(mockRoomMemberService.createRoomMember).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('방 생성 중 createRoom이 실패하면 예외를 던지고 이후 로직을 실행하지 않음', async () => {
      const createRoomError = new Error('create room failed');

      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockRejectedValueOnce(createRoomError);

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        createRoomError,
      );

      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(mockManager, createRoomProps);
      expect(mockRoomMemberService.createRoomMember).not.toHaveBeenCalled();
      expect(mockRoomRepository.findRoomById).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('방 생성 중 createRoomMember가 실패하면 예외를 던지고 최종 조회를 실행하지 않음', async () => {
      const createRoomMemberError = new Error('create room member failed');

      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.createRoomMember.mockRejectedValueOnce(createRoomMemberError);

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        createRoomMemberError,
      );

      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(mockManager, createRoomProps);
      expect(mockRoomMemberService.createRoomMember).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        mockRoomEntity.id,
      );
      expect(mockRoomRepository.findRoomById).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('방 생성 후 findRoomById가 null을 반환하면 NotFoundException을 던짐', async () => {
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.createRoomMember.mockResolvedValueOnce({
        room: { id: mockRoomEntity.id },
        user: { id: mockUserSummary.id },
      });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(null);

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(mockManager, createRoomProps);
      expect(mockRoomMemberService.createRoomMember).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        mockRoomEntity.id,
      );
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('최소 나이가 최대 나이보다 크면 BadRequestException을 반환', async () => {
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);

      await expect(
        roomService.createRoom(mockUserSummary.id, {
          ...createRoomDto,
          minAge: 30,
          maxAge: 24,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoomMemberService.findParticipatingRoomByUserId).toHaveBeenCalledWith(
        mockUserSummary.id,
        undefined,
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('과거 lunchAt으로 방을 생성하면 BadRequestException을 반환', async () => {
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);

      await expect(
        roomService.createRoom(mockUserSummary.id, {
          ...createRoomDto,
          lunchAt: '2026-03-26T23:59:59.999Z',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoomMemberService.findParticipatingRoomByUserId).toHaveBeenCalledWith(
        mockUserSummary.id,
        undefined,
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('updateRoom', () => {
    const updateRoomDto: UpdateRoomDto = {
      title: '수정된 방 제목',
      minAge: 21,
      maxAge: 25,
      lunchAt: '2099-03-28T03:30:00.000Z',
    };

    it('방장이 방 정보를 수정하면 수정된 방 정보를 반환', async () => {
      const updatedRoomEntity = {
        ...mockRoomEntity,
        title: '수정된 방 제목',
        minAge: 21,
        maxAge: 25,
        lunchAt: '2099-03-28T03:30:00.000Z',
      };

      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.updateRoom.mockResolvedValueOnce({ affected: 1 });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(updatedRoomEntity);

      const result = await roomService.updateRoom(
        mockRoomEntity.id,
        updateRoomDto,
        mockUserSummary.id,
      );

      expect(result).toEqual(updatedRoomEntity);
      expect(mockRoomRepository.findRoomById).toHaveBeenNthCalledWith(1, mockRoomEntity.id);
      expect(mockRoomRepository.updateRoom).toHaveBeenCalledWith(mockRoomEntity.id, {
        title: '수정된 방 제목',
        description: mockRoomEntity.description,
        roomType: mockRoomEntity.roomType,
        maxMembersCount: mockRoomEntity.maxMembersCount,
        maxAge: 25,
        minAge: 21,
        place: mockRoomEntity.place,
        lunchAt: '2099-03-28T03:30:00.000Z',
      });
      expect(mockRoomRepository.findRoomById).toHaveBeenNthCalledWith(2, mockRoomEntity.id);
    });

    it('방장이 아닌 사용자가 수정하면 ForbiddenException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(roomService.updateRoom(mockRoomEntity.id, updateRoomDto, 999)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRoomRepository.updateRoom).not.toHaveBeenCalled();
    });

    it('존재하지 않는 방을 수정하면 NotFoundException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(null);

      await expect(
        roomService.updateRoom(mockRoomEntity.id, updateRoomDto, mockUserSummary.id),
      ).rejects.toThrow(NotFoundException);

      expect(mockRoomRepository.updateRoom).not.toHaveBeenCalled();
    });

    it('수정 후 minAge가 maxAge보다 크면 BadRequestException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(
        roomService.updateRoom(
          mockRoomEntity.id,
          {
            minAge: 30,
          },
          mockUserSummary.id,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoomRepository.updateRoom).not.toHaveBeenCalled();
    });

    it('과거 lunchAt으로 수정하면 BadRequestException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(
        roomService.updateRoom(
          mockRoomEntity.id,
          {
            lunchAt: '2026-03-26T23:59:59.999Z',
          },
          mockUserSummary.id,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoomRepository.updateRoom).not.toHaveBeenCalled();
    });

    it('수정할 값이 없으면 기존 방 정보를 그대로 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      const result = await roomService.updateRoom(mockRoomEntity.id, {}, mockUserSummary.id);

      expect(result).toEqual(mockRoomEntity);
      expect(mockRoomRepository.updateRoom).not.toHaveBeenCalled();
    });
  });

  describe('completeRoom', () => {
    it('방장이 방 상태를 COMPLETE로 변경하면 변경된 방 정보를 반환', async () => {
      const completedRoomEntity = {
        ...mockRoomEntity,
        status: RoomStatus.COMPLETE,
      };

      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.updateRoomStatusToComplete.mockResolvedValueOnce({ affected: 1 });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(completedRoomEntity);

      const result = await roomService.completeRoom(mockRoomEntity.id, mockUserSummary.id);

      expect(result).toEqual(completedRoomEntity);
      expect(mockRoomRepository.findRoomById).toHaveBeenNthCalledWith(1, mockRoomEntity.id);
      expect(mockRoomRepository.updateRoomStatusToComplete).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(mockRoomRepository.findRoomById).toHaveBeenNthCalledWith(2, mockRoomEntity.id);
    });

    it('방장이 아닌 사용자가 상태를 변경하면 ForbiddenException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(roomService.completeRoom(mockRoomEntity.id, 999)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRoomRepository.updateRoomStatusToComplete).not.toHaveBeenCalled();
    });

    it('존재하지 않는 방을 완료 처리하면 NotFoundException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(null);

      await expect(roomService.completeRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRoomRepository.updateRoomStatusToComplete).not.toHaveBeenCalled();
    });

    it('이미 COMPLETE 상태인 방이면 BadRequestException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce({
        ...mockRoomEntity,
        status: RoomStatus.COMPLETE,
      });

      await expect(roomService.completeRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRoomRepository.updateRoomStatusToComplete).not.toHaveBeenCalled();
    });

    it('상태 변경 결과 affected가 0이면 InternalServerErrorException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.updateRoomStatusToComplete.mockResolvedValueOnce({ affected: 0 });

      await expect(roomService.completeRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('deleteRoom', () => {
    const deleteResult: DeleteResult = {
      raw: [],
      affected: 1,
    };

    it('방장이 방을 삭제하면 repository deleteRoom을 호출', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.deleteRoom.mockResolvedValueOnce(deleteResult);

      await roomService.deleteRoom(mockRoomEntity.id, mockUserSummary.id);

      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(mockRoomRepository.deleteRoom).toHaveBeenCalledWith(mockRoomEntity.id);
    });

    it('방장이 아닌 사용자가 삭제하면 ForbiddenException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(roomService.deleteRoom(mockRoomEntity.id, 999)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRoomRepository.deleteRoom).not.toHaveBeenCalled();
    });

    it('존재하지 않는 방을 삭제하면 NotFoundException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(null);

      await expect(roomService.deleteRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRoomRepository.deleteRoom).not.toHaveBeenCalled();
    });

    it('삭제 결과 affected가 0이면 NotFoundException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.deleteRoom.mockResolvedValueOnce({
        raw: [],
        affected: 0,
      });

      await expect(roomService.deleteRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('joinRoom', () => {
    const mockCurrentUser = {
      id: mockUserSummary.id,
      email: 'test@gmail.com',
      nickname: mockUserSummary.nickname,
      gender: 'MALE' as const,
      birthDate: '2005-01-01',
      schoolInfo: mockUserSummary.schoolInfo,
    };

    it('사용자가 방에 참여하면 멤버를 생성하고 반환', async () => {
      const newMember = {
        id: 10,
        room: { id: mockRoomEntity.id },
        user: { id: mockUserSummary.id },
      };

      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomMemberService.findRoomMemberCount.mockResolvedValueOnce(1);
      mockRoomRepository.increaseCurrentMembersCount.mockResolvedValueOnce(undefined);
      mockRoomMemberService.joinRoom.mockResolvedValueOnce(newMember);

      const result = await roomService.joinRoom(mockRoomEntity.id, mockUserSummary.id);

      expect(result).toEqual(newMember);
      expect(mockUserService.findMe).toHaveBeenCalledWith(mockUserSummary.id);
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(mockRoomMemberService.findParticipatingRoomByUserId).toHaveBeenCalledWith(
        mockUserSummary.id,
        undefined,
      );
      expect(mockRoomMemberService.findRoomMemberCount).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
      );
      expect(mockRoomRepository.increaseCurrentMembersCount).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
      );
      expect(mockRoomMemberService.joinRoom).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
        mockUserSummary.id,
      );
    });

    it('존재하지 않는 방에 참여하면 NotFoundException을 반환', async () => {
      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomRepository.findRoomById.mockResolvedValueOnce(null);

      await expect(roomService.joinRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRoomMemberService.findParticipatingRoomByUserId).not.toHaveBeenCalled();
    });

    it('이미 참여 중이면 BadRequestException을 반환', async () => {
      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce({ id: 123 });

      await expect(roomService.joinRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRoomMemberService.findRoomMemberCount).not.toHaveBeenCalled();
    });

    it('정원이 가득 찼으면 BadRequestException을 반환', async () => {
      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomMemberService.findRoomMemberCount.mockResolvedValueOnce(
        mockRoomEntity.maxMembersCount,
      );

      await expect(roomService.joinRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRoomRepository.increaseCurrentMembersCount).not.toHaveBeenCalled();
    });

    it('사용자 정보가 방 조건에 맞지 않으면 BadRequestException을 반환', async () => {
      mockUserService.findMe.mockResolvedValueOnce({
        ...mockCurrentUser,
        gender: 'FEMALE',
      });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);

      await expect(roomService.joinRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('quickJoin', () => {
    const mockCurrentUser = {
      id: mockUserSummary.id,
      email: 'test@gmail.com',
      nickname: mockUserSummary.nickname,
      gender: 'MALE' as const,
      birthDate: '2005-01-01',
      schoolInfo: mockUserSummary.schoolInfo,
    };

    it('조건에 맞는 방 중 하나를 골라 빠르게 참여', async () => {
      const anotherRoom = {
        ...mockRoomEntity,
        id: 2,
      };
      const newMember = {
        id: 10,
        room: { id: anotherRoom.id },
        user: { id: mockUserSummary.id },
      };
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.9);

      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomRepository.findJoinableRooms.mockResolvedValueOnce([mockRoomEntity, anotherRoom]);
      mockRoomMemberService.findRoomMemberCount.mockResolvedValueOnce(1);
      mockRoomRepository.increaseCurrentMembersCount.mockResolvedValueOnce(undefined);
      mockRoomMemberService.joinRoom.mockResolvedValueOnce(newMember);

      const result = await roomService.quickJoin(mockUserSummary.id);

      expect(result).toEqual(newMember);
      expect(mockUserService.findMe).toHaveBeenCalledWith(mockUserSummary.id);
      expect(mockRoomMemberService.findParticipatingRoomByUserId).toHaveBeenCalledWith(
        mockUserSummary.id,
        mockManager,
      );
      expect(mockRoomRepository.findJoinableRooms).toHaveBeenCalledWith(
        {
          age: 22,
          gender: 'MALE',
        },
        mockManager,
      );
      expect(mockRoomMemberService.findRoomMemberCount).toHaveBeenCalledWith(mockManager, 2);
      expect(mockRoomRepository.increaseCurrentMembersCount).toHaveBeenCalledWith(mockManager, 2);
      expect(mockRoomMemberService.joinRoom).toHaveBeenCalledWith(
        mockManager,
        2,
        mockUserSummary.id,
      );
    });

    it('이미 참여 중인 방이 있으면 BadRequestException을 반환', async () => {
      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce({ id: 123 });

      await expect(roomService.quickJoin(mockUserSummary.id)).rejects.toThrow(BadRequestException);

      expect(mockRoomRepository.findJoinableRooms).not.toHaveBeenCalled();
      expect(mockRoomRepository.increaseCurrentMembersCount).not.toHaveBeenCalled();
    });

    it('참여 가능한 방이 없으면 NotFoundException을 반환', async () => {
      mockUserService.findMe.mockResolvedValueOnce(mockCurrentUser);
      mockRoomMemberService.findParticipatingRoomByUserId.mockResolvedValueOnce(null);
      mockRoomRepository.findJoinableRooms.mockResolvedValueOnce([]);

      await expect(roomService.quickJoin(mockUserSummary.id)).rejects.toThrow(NotFoundException);

      expect(mockRoomRepository.findJoinableRooms).toHaveBeenCalled();
      expect(mockRoomRepository.increaseCurrentMembersCount).not.toHaveBeenCalled();
    });
  });

  describe('leaveRoom', () => {
    it('일반 멤버가 방을 나가면 멤버 수를 줄이고 멤버를 삭제', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.isRoomMember.mockResolvedValueOnce(true);
      mockRoomRepository.decreaseCurrentMembersCount.mockResolvedValueOnce(undefined);
      mockRoomMemberService.leaveRoom.mockResolvedValueOnce({ affected: 1 });
      mockRoomMemberService.findRoomMemberCount.mockResolvedValueOnce(1);

      await roomService.leaveRoom(mockRoomEntity.id, mockUserSummary.id + 1);

      expect(mockRoomRepository.decreaseCurrentMembersCount).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
      );
      expect(mockRoomMemberService.leaveRoom).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
        mockUserSummary.id + 1,
      );
      expect(mockRoomRepository.updateRoomHostUser).not.toHaveBeenCalled();
    });

    it('방장이 나가면 처음 들어왔던 일반 참여자를 새 방장으로 변경', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.isRoomMember.mockResolvedValueOnce(true);
      mockRoomRepository.decreaseCurrentMembersCount.mockResolvedValueOnce(undefined);
      mockRoomMemberService.leaveRoom.mockResolvedValueOnce({ affected: 1 });
      mockRoomMemberService.findFirstJoinedMemberId.mockResolvedValueOnce(2);
      mockRoomRepository.updateRoomHostUser.mockResolvedValueOnce({ affected: 1 });
      mockRoomMemberService.findRoomMemberCount.mockResolvedValueOnce(1);

      await roomService.leaveRoom(mockRoomEntity.id, mockUserSummary.id);

      expect(mockRoomMemberService.findFirstJoinedMemberId).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
        mockUserSummary.id,
      );
      expect(mockRoomRepository.updateRoomHostUser).toHaveBeenCalledWith(mockManager, 1, 2);
    });

    it('마지막 멤버가 나가면 방을 삭제', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.isRoomMember.mockResolvedValueOnce(true);
      mockRoomRepository.decreaseCurrentMembersCount.mockResolvedValueOnce(undefined);
      mockRoomMemberService.leaveRoom.mockResolvedValueOnce({ affected: 1 });
      mockRoomMemberService.findFirstJoinedMemberId.mockResolvedValueOnce(undefined);
      mockRoomMemberService.findRoomMemberCount.mockResolvedValueOnce(0);
      mockRoomRepository.deleteRoom.mockResolvedValueOnce({ raw: [], affected: 1 });

      await roomService.leaveRoom(mockRoomEntity.id, mockUserSummary.id);

      expect(mockRoomRepository.deleteRoom).toHaveBeenCalledWith(mockRoomEntity.id, mockManager);
    });

    it('참여하지 않은 사용자가 나가기를 요청하면 BadRequestException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.isRoomMember.mockResolvedValueOnce(false);

      await expect(roomService.leaveRoom(mockRoomEntity.id, mockUserSummary.id)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('kickRoomMember', () => {
    it('방장이 일반 멤버를 강제 퇴장시키면 멤버 수를 줄이고 멤버를 삭제', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.isRoomMember.mockResolvedValueOnce(true);
      mockRoomRepository.decreaseCurrentMembersCount.mockResolvedValueOnce(undefined);
      mockRoomMemberService.leaveRoom.mockResolvedValueOnce({ affected: 1 });

      await roomService.kickRoomMember(mockRoomEntity.id, 2, mockUserSummary.id);

      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id, mockManager);
      expect(mockRoomMemberService.isRoomMember).toHaveBeenCalledWith(
        mockRoomEntity.id,
        2,
        mockManager,
      );
      expect(mockRoomRepository.decreaseCurrentMembersCount).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
      );
      expect(mockRoomMemberService.leaveRoom).toHaveBeenCalledWith(
        mockManager,
        mockRoomEntity.id,
        2,
      );
    });

    it('방장이 아닌 사용자가 강제 퇴장시키면 ForbiddenException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(roomService.kickRoomMember(mockRoomEntity.id, 2, 999)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockRoomRepository.decreaseCurrentMembersCount).not.toHaveBeenCalled();
    });

    it('자기 자신을 강제 퇴장시키려 하면 BadRequestException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);

      await expect(
        roomService.kickRoomMember(mockRoomEntity.id, mockUserSummary.id, mockUserSummary.id),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoomMemberService.isRoomMember).not.toHaveBeenCalled();
    });

    it('참여 중이지 않은 사용자를 강제 퇴장시키려 하면 BadRequestException을 반환', async () => {
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      mockRoomMemberService.isRoomMember.mockResolvedValueOnce(false);

      await expect(
        roomService.kickRoomMember(mockRoomEntity.id, 2, mockUserSummary.id),
      ).rejects.toThrow(BadRequestException);

      expect(mockRoomRepository.decreaseCurrentMembersCount).not.toHaveBeenCalled();
    });
  });

  describe('findExpiredRooms', () => {
    it('지난 시간의 열린 방 ID 목록을 반환', async () => {
      mockRoomRepository.findExpiredOpenRooms.mockResolvedValueOnce([
        mockRoomEntity,
        mockSecondRoomEntity,
      ]);

      const result = await roomService.findExpiredRooms();

      expect(result).toEqual([mockRoomEntity.id, mockSecondRoomEntity.id]);
      expect(mockRoomRepository.findExpiredOpenRooms).toHaveBeenCalledWith(
        '2026-03-27T00:00:00.000Z',
      );
    });

    it('지난 시간의 열린 방이 없으면 빈 배열을 반환', async () => {
      mockRoomRepository.findExpiredOpenRooms.mockResolvedValueOnce([]);

      await expect(roomService.findExpiredRooms()).resolves.toEqual([]);
    });
  });

  describe('closeExpiredRooms', () => {
    it('전달받은 방 ID 목록의 상태를 CLOSE로 변경하고 ID 목록을 반환', async () => {
      const roomIds = [mockRoomEntity.id, mockSecondRoomEntity.id];
      mockRoomRepository.closeRooms.mockResolvedValueOnce({ affected: roomIds.length });

      const result = await roomService.closeExpiredRooms(roomIds);

      expect(result).toEqual(roomIds);
      expect(mockRoomRepository.closeRooms).toHaveBeenCalledWith(roomIds);
    });

    it('상태 변경된 개수가 방 ID 개수와 다르면 InternalServerErrorException을 반환', async () => {
      const roomIds = [mockRoomEntity.id, mockSecondRoomEntity.id];
      mockRoomRepository.closeRooms.mockResolvedValueOnce({ affected: 1 });

      await expect(roomService.closeExpiredRooms(roomIds)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
