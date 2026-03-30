import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { RoomService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ResponseRoomDetailDto } from './dto/room-response.dto';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto): Promise<ResponseRoomDetailDto> {
    const userId: number = 1;
    return await this.roomService.createRoom(userId, createRoomDto);
  }

  @Get(':id')
  async findRoomById(@Param('id', ParseIntPipe) roomId: number): Promise<ResponseRoomDetailDto> {
    return await this.roomService.findRoomById(roomId);
  }
}
