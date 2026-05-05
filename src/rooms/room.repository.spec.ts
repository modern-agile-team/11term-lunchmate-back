import { Between, LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RoomRepository } from './room.repository';
import { Room, RoomStatus, RoomType } from './entities/room.entity';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

describe('RoomRepository', () => {
  let roomRepository: RoomRepository;
  let roomOrmRepository: Pick<Repository<Room>, 'update' | 'softDelete'>;
  const manager = {
    update: jest.fn(),
  };

  beforeEach(() => {
    roomOrmRepository = {
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    roomRepository = new RoomRepository(roomOrmRepository as Repository<Room>);
  });

  describe('findRoomFilter', () => {
    it('roomType, status, age, cursor 조건을 포함한 필터를 생성', () => {
      const query: FindRoomsQueryDto = {
        roomType: RoomType.MALE,
        status: RoomStatus.OPEN,
        minAge: 20,
        maxAge: 24,
        cursor: 10,
      };

      const result = roomRepository.findRoomFilter(query);

      expect(result.roomType).toBe(RoomType.MALE);
      expect(result.status).toBe(RoomStatus.OPEN);
      expect(result.minAge).toEqual(MoreThanOrEqual(20));
      expect(result.maxAge).toEqual(LessThanOrEqual(24));
      expect(result.id).toEqual(LessThan(10));
    });

    it('lunchAtFrom과 lunchAtTo가 모두 있으면 Between 조건을 생성', () => {
      const query: FindRoomsQueryDto = {
        lunchAtFrom: '2026-03-31 12:00:00',
        lunchAtTo: '2026-03-31 14:00:00',
      };

      const result = roomRepository.findRoomFilter(query);

      expect(result.lunchAt).toEqual(Between('2026-03-31 12:00:00', '2026-03-31 14:00:00'));
    });

    it('lunchAtFrom만 있으면 MoreThanOrEqual 조건을 생성', () => {
      const query: FindRoomsQueryDto = {
        lunchAtFrom: '2026-03-31 12:00:00',
      };

      const result = roomRepository.findRoomFilter(query);

      expect(result.lunchAt).toEqual(MoreThanOrEqual('2026-03-31 12:00:00'));
    });

    it('lunchAtTo만 있으면 LessThanOrEqual 조건을 생성', () => {
      const query: FindRoomsQueryDto = {
        lunchAtTo: '2026-03-31 14:00:00',
      };

      const result = roomRepository.findRoomFilter(query);

      expect(result.lunchAt).toEqual(LessThanOrEqual('2026-03-31 14:00:00'));
    });
  });

  describe('updateRoom', () => {
    it('roomId와 수정 DTO로 update를 호출', async () => {
      const roomId = 1;
      const updateRoomDto: UpdateRoomDto = {
        title: '수정된 방 제목',
        minAge: 21,
      };
      const updateResult = {
        affected: 1,
      };

      (roomOrmRepository.update as jest.Mock).mockResolvedValue(updateResult);

      const result = await roomRepository.updateRoom(roomId, updateRoomDto);

      expect(result).toEqual(updateResult);
      expect(roomOrmRepository.update).toHaveBeenCalledWith(roomId, updateRoomDto);
    });
  });

  describe('updateRoomStatusToComplete', () => {
    it('roomId로 상태를 COMPLETE로 변경하는 update를 호출', async () => {
      const roomId = 1;
      const updateResult = {
        affected: 1,
      };

      (roomOrmRepository.update as jest.Mock).mockResolvedValue(updateResult);

      const result = await roomRepository.updateRoomStatusToComplete(roomId);

      expect(result).toEqual(updateResult);
      expect(roomOrmRepository.update).toHaveBeenCalledWith(roomId, {
        status: RoomStatus.COMPLETE,
      });
    });
  });

  describe('deleteRoom', () => {
    it('roomId로 softDelete를 호출', async () => {
      const roomId = 1;
      const deleteResult = {
        affected: 1,
      };

      (roomOrmRepository.softDelete as jest.Mock).mockResolvedValue(deleteResult);

      const result = await roomRepository.deleteRoom(roomId);

      expect(result).toEqual(deleteResult);
      expect(roomOrmRepository.softDelete).toHaveBeenCalledWith(roomId);
    });
  });

  describe('updateRoomHostUser', () => {
    it('roomId와 새로운 hostUserId로 host를 변경', async () => {
      const updateResult = {
        affected: 1,
      };

      manager.update.mockResolvedValue(updateResult);

      const result = await roomRepository.updateRoomHostUser(manager as never, 1, 2);

      expect(result).toEqual(updateResult);
      expect(manager.update).toHaveBeenCalledWith(Room, 1, {
        hostUserId: 2,
      });
    });
  });
});
