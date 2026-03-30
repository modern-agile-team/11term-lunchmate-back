import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RoomService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ResponseRoomDetailDto } from './dto/room-response.dto';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Room')
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Authenticated()
  @Post()
  @ApiOperation({ summary: '방 생성' })
  @ApiCreatedResponse({ type: ResponseRoomDetailDto })
  async createRoom(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createRoomDto: CreateRoomDto,
  ): Promise<ResponseRoomDetailDto> {
    return await this.roomService.createRoom(currentUser.userId, createRoomDto);
  }

  @Get(':id')
  @ApiOperation({ summary: '방 상세 조회' })
  @ApiParam({ name: 'id', description: '조회할 방 ID', type: Number })
  @ApiOkResponse({ type: ResponseRoomDetailDto })
  async findRoomById(@Param('id', ParseIntPipe) roomId: number): Promise<ResponseRoomDetailDto> {
    return await this.roomService.findRoomById(roomId);
  }
}
