import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RoomService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import {
  ResponseOpenRoomsCountDto,
  ResponseRoomDetailDto,
  ResponseRoomListDto,
} from './dto/room-response.dto';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FindRoomsQueryDto } from './dto/find-rooms-query.dto';

@ApiTags('Room')
@ApiExtraModels(ResponseRoomListDto, ResponseRoomDetailDto)
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

  @Get()
  @ApiOperation({ summary: '방 목록 조회' })
  @ApiQuery({ name: 'cursor', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'roomType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'minAge', required: false, type: Number })
  @ApiQuery({ name: 'maxAge', required: false, type: Number })
  @ApiQuery({ name: 'lunchAtFrom', required: false, type: String })
  @ApiQuery({ name: 'lunchAtTo', required: false, type: String })
  @ApiOkResponse({ type: ResponseRoomListDto })
  async findRooms(@Query() query: FindRoomsQueryDto): Promise<ResponseRoomListDto> {
    return await this.roomService.findRooms(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '방 상세 조회' })
  @ApiParam({ name: 'id', description: '조회할 방 ID', type: Number })
  @ApiOkResponse({ type: ResponseRoomDetailDto })
  async findRoomById(@Param('id', ParseIntPipe) roomId: number): Promise<ResponseRoomDetailDto> {
    return await this.roomService.findRoomById(roomId);
  }

  @Get('count/open')
  @ApiOperation({ summary: '열려있는 방 갯수 조회' })
  @ApiOkResponse({ type: ResponseOpenRoomsCountDto })
  async findOpenRoomsCount(): Promise<ResponseOpenRoomsCountDto> {
    return await this.roomService.findOpenRoomsCount();
  }
}
