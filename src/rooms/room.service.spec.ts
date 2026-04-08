import { Test, TestingModule } from '@nestjs/testing';
import { RoomService } from './rooms.service';
import { RoomRepository } from './room.repository';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { RoomStatus, RoomType } from './entities/room.entity';
import { RoomMapper } from './mappers/room.mapper';
import { PAGINATION_CONSTANTS } from './constants/room.constant';

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

const mockRoomDetailDto = {
  ...roomEntityBase,
  hostUserId: mockUserSummary.id,
  roomMembers: [mockUserSummary],
};

const mockRoomListDto = {
  items: [
    {
      ...roomEntityBase,
      hostUserId: mockUserSummary.id,
    },
  ],
  nextCursor: null,
  hasNext: false,
};

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

const mockDataSource = {
  transaction: jest.fn(),
};

const mockManager = {
  save: jest.fn(),
} as unknown as EntityManager;

const mockRoomRepository = {
  createRoom: jest.fn(),
  createRoomMember: jest.fn(),
  findRoomById: jest.fn(),
  findRooms: jest.fn(),
  findParticipatingRoom: jest.fn(),
};

describe('RoomService', () => {
  let roomService: RoomService;
  let roomMapperSpy: jest.SpiedFunction<typeof RoomMapper.toDetailDto>;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-27T00:00:00.000Z'));
    jest.clearAllMocks();
    roomMapperSpy = jest.spyOn(RoomMapper, 'toDetailDto');

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
      roomMapperSpy.mockReturnValue(mockRoomDetailDto);

      const result = await roomService.findRoomById(mockRoomEntity.id);

      expect(result).toEqual(mockRoomDetailDto);
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(roomMapperSpy).toHaveBeenCalledWith(mockRoomEntity);
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
      const toListDtoSpy = jest.spyOn(RoomMapper, 'toListDto').mockReturnValue(mockRoomListDto);

      const result = await roomService.findRooms(query);

      expect(result).toEqual(mockRoomListDto);
      expect(mockRoomRepository.findRooms).toHaveBeenCalledWith(query);
      expect(toListDtoSpy).toHaveBeenCalledWith([mockRoomEntity], null, false);
    });

    it('limit보다 많은 방이 조회되면 nextCursor와 hasNext를 반환', async () => {
      const query: FindRoomsQueryDto = {
        limit: 1,
      };
      const paginatedListDto = {
        items: [
          {
            ...roomEntityBase,
            id: mockSecondRoomEntity.id,
            title: mockSecondRoomEntity.title,
            hostUserId: mockUserSummary.id,
          },
        ],
        nextCursor: mockSecondRoomEntity.id,
        hasNext: true,
      };

      mockRoomRepository.findRooms.mockResolvedValue([mockSecondRoomEntity, mockRoomEntity]);
      const toListDtoSpy = jest.spyOn(RoomMapper, 'toListDto').mockReturnValue(paginatedListDto);

      const result = await roomService.findRooms(query);

      expect(result).toEqual(paginatedListDto);
      expect(mockRoomRepository.findRooms).toHaveBeenCalledWith(query);
      expect(toListDtoSpy).toHaveBeenCalledWith(
        [mockSecondRoomEntity],
        mockSecondRoomEntity.id,
        true,
      );
    });

    it('limit이 없으면 기본 페이지 크기를 기준으로 페이징', async () => {
      const query: FindRoomsQueryDto = {};
      const rooms = Array.from({ length: PAGINATION_CONSTANTS.DEFAULT_LIMIT + 1 }, (_, index) => ({
        ...mockRoomEntity,
        id: PAGINATION_CONSTANTS.DEFAULT_LIMIT + 1 - index,
      }));

      mockRoomRepository.findRooms.mockResolvedValue(rooms);
      const toListDtoSpy = jest.spyOn(RoomMapper, 'toListDto').mockReturnValue({
        items: [],
        nextCursor: 1,
        hasNext: true,
      });

      await roomService.findRooms(query);

      expect(toListDtoSpy).toHaveBeenCalledWith(
        rooms.slice(0, PAGINATION_CONSTANTS.DEFAULT_LIMIT),
        2,
        true,
      );
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
      mockRoomRepository.findParticipatingRoom.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.createRoomMember.mockResolvedValueOnce({
        room: { id: mockRoomEntity.id },
        user: { id: mockUserSummary.id },
      });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(mockRoomEntity);
      roomMapperSpy.mockReturnValue(mockRoomDetailDto);

      const result = await roomService.createRoom(mockUserSummary.id, createRoomDto);

      expect(result).toEqual(mockRoomDetailDto);
      expect(mockRoomRepository.findParticipatingRoom).toHaveBeenCalledWith(mockUserSummary.id);
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(roomMapperSpy).toHaveBeenCalledWith(mockRoomEntity);
      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        createRoomDto,
      );
      expect(mockRoomRepository.createRoomMember).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        mockRoomEntity.id,
      );
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('이미 창여중인 방이 있는 사용자가 방을 생성하면 BadRequestException을 반환', async () => {
      mockRoomRepository.findParticipatingRoom.mockResolvedValueOnce({ id: 99 });

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockRoomRepository.createRoom).not.toHaveBeenCalled();
      expect(mockRoomRepository.createRoomMember).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('방 생성 중 createRoom이 실패하면 예외를 던지고 이후 로직을 실행하지 않음', async () => {
      const createRoomError = new Error('create room failed');

      mockRoomRepository.findParticipatingRoom.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockRejectedValueOnce(createRoomError);

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        createRoomError,
      );

      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        createRoomDto,
      );
      expect(mockRoomRepository.createRoomMember).not.toHaveBeenCalled();
      expect(mockRoomRepository.findRoomById).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('방 생성 중 createRoomMember가 실패하면 예외를 던지고 최종 조회를 실행하지 않음', async () => {
      const createRoomMemberError = new Error('create room member failed');

      mockRoomRepository.findParticipatingRoom.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.createRoomMember.mockRejectedValueOnce(createRoomMemberError);

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        createRoomMemberError,
      );

      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        createRoomDto,
      );
      expect(mockRoomRepository.createRoomMember).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        mockRoomEntity.id,
      );
      expect(mockRoomRepository.findRoomById).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('방 생성 후 findRoomById가 null을 반환하면 NotFoundException을 던짐', async () => {
      mockRoomRepository.findParticipatingRoom.mockResolvedValueOnce(null);
      mockRoomRepository.createRoom.mockResolvedValueOnce(mockRoomEntity);
      mockRoomRepository.createRoomMember.mockResolvedValueOnce({
        room: { id: mockRoomEntity.id },
        user: { id: mockUserSummary.id },
      });
      mockRoomRepository.findRoomById.mockResolvedValueOnce(null);

      await expect(roomService.createRoom(mockUserSummary.id, createRoomDto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRoomRepository.createRoom).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        createRoomDto,
      );
      expect(mockRoomRepository.createRoomMember).toHaveBeenCalledWith(
        mockManager,
        mockUserSummary.id,
        mockRoomEntity.id,
      );
      expect(mockRoomRepository.findRoomById).toHaveBeenCalledWith(mockRoomEntity.id);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });
});
