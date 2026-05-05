import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
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
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomMember } from './entities/room-member.entity';
import { ResponseRoomMemberListDto } from './dto/room-member.response.dto';
import { RoomMapper } from './mappers/room.mapper';
import { RoomMemberMapper } from './mappers/room-member.mapper';

@ApiTags('Room')
@ApiExtraModels(ResponseRoomListDto, ResponseRoomDetailDto, ResponseRoomMemberListDto)
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get('me')
  @Authenticated()
  @ApiOperation({ summary: '현재 사용자가 참여 중인 방 조회' })
  @ApiOkResponse({ type: ResponseRoomDetailDto })
  @ApiBadRequestResponse({ description: '현재 참여 중인 방이 없는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async findRoomByUserId(@CurrentUser() user: AuthenticatedUser): Promise<ResponseRoomDetailDto> {
    const room = await this.roomService.findParticipatingRoomByUserId(user.userId);

    return RoomMapper.toDetailDto(room);
  }

  @Authenticated()
  @Post()
  @ApiOperation({ summary: '방 생성' })
  @ApiCreatedResponse({ type: ResponseRoomDetailDto })
  @ApiBadRequestResponse({
    description: '방 생성 요청 값이 올바르지 않거나 이미 참여 중인 방이 있는 경우',
  })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async createRoom(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createRoomDto: CreateRoomDto,
  ): Promise<ResponseRoomDetailDto> {
    const createdRoom = await this.roomService.createRoom(currentUser.userId, createRoomDto);

    return RoomMapper.toDetailDto(createdRoom);
  }

  @Get()
  @ApiOperation({ summary: '방 목록 조회' })
  @ApiOkResponse({ type: ResponseRoomListDto })
  @ApiBadRequestResponse({ description: '조회 조건이 올바르지 않은 경우' })
  async findRooms(@Query() query: FindRoomsQueryDto): Promise<ResponseRoomListDto> {
    const { items, nextCursor, hasNext } = await this.roomService.findRooms(query);

    return RoomMapper.toListDto(items, nextCursor, hasNext);
  }

  @Get(':id')
  @ApiOperation({ summary: '방 상세 조회' })
  @ApiOkResponse({ type: ResponseRoomDetailDto })
  @ApiNotFoundResponse({ description: '존재하지 않는 방을 조회하려는 경우' })
  async findRoomById(@Param('id', ParseIntPipe) roomId: number): Promise<ResponseRoomDetailDto> {
    const room = await this.roomService.findRoomById(roomId);

    return RoomMapper.toDetailDto(room);
  }

  @Get('count/open')
  @ApiOperation({ summary: '열려있는 방 갯수 조회' })
  @ApiOkResponse({ type: ResponseOpenRoomsCountDto })
  async findOpenRoomsCount(): Promise<ResponseOpenRoomsCountDto> {
    return await this.roomService.findOpenRoomsCount();
  }

  @Patch(':id')
  @Authenticated()
  @ApiOperation({ summary: '방 수정' })
  @ApiOkResponse({ type: ResponseRoomDetailDto })
  @ApiBadRequestResponse({ description: '수정 요청 값이 올바르지 않은 경우' })
  @ApiForbiddenResponse({ description: '방장이 아닌 사용자가 수정을 시도한 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 방을 수정하려는 경우' })
  async updateRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @Body() updateRoomDto: UpdateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponseRoomDetailDto> {
    const updatedRoom = await this.roomService.updateRoom(roomId, updateRoomDto, user.userId);

    return RoomMapper.toDetailDto(updatedRoom);
  }

  @Patch(':id/complete')
  @Authenticated()
  @ApiOperation({ summary: '방의 상태를 완료 상태로 변경' })
  @ApiOkResponse({ type: ResponseRoomDetailDto })
  @ApiNotFoundResponse({ description: '존재하지 않는 방을 수정하려는 경우' })
  @ApiForbiddenResponse({ description: '방장이 아닌 사용자가 수정을 시도한 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  @ApiBadRequestResponse({ description: '이미 COMPLETE 상태의 방인 경우' })
  async completeRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const completedRoom = await this.roomService.completeRoom(roomId, user.userId);

    return RoomMapper.toDetailDto(completedRoom);
  }

  @Delete(':id')
  @Authenticated()
  @HttpCode(204)
  @ApiOperation({
    summary: '방 삭제',
    description: '방장만 방을 삭제할 수 있으며, 성공 시 응답 본문 없이 204 No Content를 반환',
  })
  @ApiNoContentResponse({ description: '방 삭제 성공, 응답 본문은 반환되지 않음' })
  @ApiForbiddenResponse({ description: '방장이 아닌 사용자가 삭제를 시도한 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 방을 삭제하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async deleteRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.roomService.deleteRoom(roomId, user.userId);
  }

  @Post(':id/join')
  @Authenticated()
  @HttpCode(201)
  @ApiOperation({ summary: '방 참여' })
  @ApiCreatedResponse({ description: '방 참여 성공' })
  @ApiBadRequestResponse({
    description: '이미 참여 중이거나, 방 상태/정원/방 조건에 맞지 않는 경우',
  })
  @ApiNotFoundResponse({ description: '존재하지 않는 방에 참여하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async joinRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoomMember> {
    return await this.roomService.joinRoom(roomId, user.userId);
  }

  @Delete(':id/leave')
  @Authenticated()
  @HttpCode(204)
  @ApiOperation({
    summary: '방 나가기',
    description: '참여 중인 방에서 나가며, 성공 시 응답 본문 없이 204 No Content를 반환',
  })
  @ApiNoContentResponse({ description: '방 나가기 성공, 응답 본문은 반환되지 않음' })
  @ApiBadRequestResponse({ description: '해당 방에 참여하지 않은 사용자인 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 방에서 나가려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async leaveRoom(
    @Param('id', ParseIntPipe) roomId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.roomService.leaveRoom(roomId, user.userId);
  }

  @Delete('/:roomId/members/:userId')
  @Authenticated()
  @HttpCode(204)
  @ApiOperation({
    summary: '방 멤버 강제 퇴장',
    description:
      '방장만 다른 참여자를 강제 퇴장시킬 수 있으며, 성공 시 응답 본문 없이 204 No Content를 반환',
  })
  @ApiNoContentResponse({ description: '강제 퇴장 성공, 응답 본문은 반환되지 않음' })
  @ApiBadRequestResponse({
    description: '대상 사용자가 방에 없거나, 방장/자기 자신을 강제 퇴장시키려는 경우',
  })
  @ApiForbiddenResponse({ description: '방장이 아닌 사용자가 강제 퇴장을 시도한 경우' })
  @ApiNotFoundResponse({ description: '존재하지 않는 방에서 강제 퇴장을 시도한 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async kickRoomMember(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.roomService.kickRoomMember(roomId, userId, user.userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '방 멤버 조회' })
  @ApiOkResponse({ type: ResponseRoomMemberListDto })
  @ApiNotFoundResponse({ description: '존재하지 않는 방의 멤버를 조회하려는 경우' })
  async findRoomMembersById(
    @Param('id', ParseIntPipe) roomId: number,
  ): Promise<ResponseRoomMemberListDto> {
    const roomMembers = await this.roomService.findRoomMembersByRoomId(roomId);

    return RoomMemberMapper.toListDto(roomMembers);
  }

  @Post('quick-join')
  @Authenticated()
  @HttpCode(201)
  @ApiOperation({ summary: '빠른 참여' })
  @ApiCreatedResponse({ description: '사용자 조건에 맞는 방에 빠르게 참여 성공' })
  @ApiBadRequestResponse({ description: '이미 참여 중인 방이 있는 경우' })
  @ApiNotFoundResponse({ description: '참여 가능한 방이 없는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  async quickJoin(@CurrentUser() user: AuthenticatedUser): Promise<RoomMember> {
    return await this.roomService.quickJoin(user.userId);
  }
}
