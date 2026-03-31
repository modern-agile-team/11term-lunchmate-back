import { Between, LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { RoomRepository } from './room.repository';
import { Room, RoomStatus, RoomType } from './entities/room.entity';
import { RoomMember } from './entities/room-member.entity';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';

describe('RoomRepository', () => {
  let roomRepository: RoomRepository;

  beforeEach(() => {
    roomRepository = new RoomRepository({} as Repository<Room>, {} as Repository<RoomMember>);
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
});
