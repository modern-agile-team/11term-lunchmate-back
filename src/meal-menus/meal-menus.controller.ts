import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalAuthenticated } from '../auth/decorators/optional-authenticated.decorator';
import { OptionalCurrentUser } from '../auth/decorators/optional-current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { GetMealMenuRankingQueryDto } from './dto/get-meal-menu-ranking-query.dto';
import { MealMenuDetailResponseDto } from './dto/meal-menu-detail-response.dto';
import { MealMenuListItemResponseDto } from './dto/meal-menu-list-item-response.dto';
import { MealMenuListResponseDto } from './dto/meal-menu-list-response.dto';
import { MealMenuReactionResponseDto } from './dto/meal-menu-reaction-response.dto';
import { ActionType } from './entities/meal-menu-reaction.entity';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenusService } from './meal-menus.service';
import { Roles } from 'src/auth/decorators/role.decorator';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { CreateMealMenuDto } from './dto/create-meal-menu.dto';
import { UpdateMealMenuDto } from './dto/update-meal-menu.dto';
import { UserRole } from 'src/users/types/user.type';

@ApiTags('MealMenu')
@Controller('meal-menus')
export class MealMenusController {
  constructor(private readonly mealMenusService: MealMenusService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '학식 추가' })
  @ApiCreatedResponse({ type: MealMenuDetailResponseDto, description: '학식 추가 성공' })
  @ApiBadRequestResponse({ description: '학식 추가 요청 값이 올바르지 않은 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  @ApiForbiddenResponse({ description: '관리자 권한이 없는 사용자가 요청한 경우' })
  async createMealMenu(
    @Body() createMealMenuDto: CreateMealMenuDto,
  ): Promise<MealMenuDetailResponseDto> {
    const newMealMenu = await this.mealMenusService.createMealMenu(createMealMenuDto);

    return this.toDetailResponse(newMealMenu);
  }

  @Get()
  @OptionalAuthenticated()
  @ApiOperation({ summary: '학식 목록 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenus(
    @OptionalCurrentUser() currentUser: AuthenticatedUser | null,
    @Query() query: GetMealMenuListQueryDto,
  ): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenusService.findMealMenus(query);
    const myReactions = await this.findMyReactionsMap(currentUser, mealMenus);

    return this.toListResponse(mealMenus, myReactions);
  }

  @Get('rankings')
  @OptionalAuthenticated()
  @ApiOperation({ summary: '학식 랭킹 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenuRankings(
    @OptionalCurrentUser() currentUser: AuthenticatedUser | null,
    @Query() query: GetMealMenuRankingQueryDto,
  ): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenusService.findMealMenuRankings(query);
    const myReactions = await this.findMyReactionsMap(currentUser, mealMenus);

    return this.toListResponse(mealMenus, myReactions);
  }

  @Get(':mealMenuId')
  @ApiOperation({ summary: '학식 상세 조회' })
  @ApiOkResponse({ type: MealMenuDetailResponseDto })
  async findMealMenuById(
    @Param('mealMenuId', ParseIntPipe) mealMenuId: number,
  ): Promise<MealMenuDetailResponseDto> {
    const mealMenu = await this.mealMenusService.findMealMenuById(mealMenuId);
    return this.toDetailResponse(mealMenu);
  }

  @Post(':mealMenuId/like')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: '학식 좋아요' })
  @ApiOkResponse({ type: MealMenuReactionResponseDto })
  async likeMealMenu(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('mealMenuId', ParseIntPipe) mealMenuId: number,
  ): Promise<MealMenuReactionResponseDto> {
    const mealMenu = await this.mealMenusService.likeMealMenu(currentUser.userId, mealMenuId);
    return this.toReactionResponse(ActionType.LIKE, mealMenu);
  }

  @Post(':mealMenuId/dislike')
  @HttpCode(HttpStatus.OK)
  @Authenticated()
  @ApiOperation({ summary: '학식 싫어요' })
  @ApiOkResponse({ type: MealMenuReactionResponseDto })
  async dislikeMealMenu(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('mealMenuId', ParseIntPipe) mealMenuId: number,
  ): Promise<MealMenuReactionResponseDto> {
    const mealMenu = await this.mealMenusService.dislikeMealMenu(currentUser.userId, mealMenuId);
    return this.toReactionResponse(ActionType.DISLIKE, mealMenu);
  }

  @Patch(':mealMenuId')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '학식 수정' })
  @ApiOkResponse({ type: MealMenuDetailResponseDto, description: '학식 수정 성공' })
  @ApiNotFoundResponse({ description: '존재하지 않는 학식을 수정하려는 경우' })
  @ApiBadRequestResponse({ description: '학식 수정 요청 값이 올바르지 않은 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  @ApiForbiddenResponse({ description: '관리자 권한이 없는 사용자가 요청한 경우' })
  async updateMealMenu(
    @Body() updateMealMenuDto: UpdateMealMenuDto,
    @Param('mealMenuId', ParseIntPipe) mealMenuId: number,
  ): Promise<MealMenuDetailResponseDto> {
    if (Object.keys(updateMealMenuDto).length < 1)
      throw new BadRequestException('수정할 값이 없습니다.');

    const updatedMealMenu = await this.mealMenusService.updateMealMenu(
      mealMenuId,
      updateMealMenuDto,
    );

    return this.toDetailResponse(updatedMealMenu);
  }

  @Delete(':mealMenuId')
  @HttpCode(204)
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '학식 삭제' })
  @ApiNoContentResponse({ description: '학식 삭제 성공, 응답 본문은 반환되지 않음' })
  @ApiNotFoundResponse({ description: '존재하지 않는 학식을 삭제하려는 경우' })
  @ApiUnauthorizedResponse({ description: '로그인하지 않은 사용자가 요청한 경우' })
  @ApiForbiddenResponse({ description: '관리자 권한이 없는 사용자가 요청한 경우' })
  async deleteMealMenu(@Param('mealMenuId', ParseIntPipe) mealMenuId: number): Promise<void> {
    return await this.mealMenusService.deleteMealMenu(mealMenuId);
  }

  private async findMyReactionsMap(
    currentUser: AuthenticatedUser | null,
    mealMenus: MealMenu[],
  ): Promise<Map<number, ActionType>> {
    if (!currentUser) return new Map();

    return this.mealMenusService.findMyReactionsMap(
      currentUser.userId,
      mealMenus.map((mealMenu) => mealMenu.id),
    );
  }

  private toListResponse(
    mealMenus: MealMenu[],
    myReactions: Map<number, ActionType>,
  ): MealMenuListResponseDto {
    return {
      items: mealMenus.map((mealMenu) => this.toListItem(mealMenu, myReactions)),
    };
  }

  private toListItem(
    mealMenu: MealMenu,
    myReactions: Map<number, ActionType>,
  ): MealMenuListItemResponseDto {
    return {
      id: mealMenu.id,
      mealType: mealMenu.mealType,
      menuName: mealMenu.menuName,
      price: mealMenu.price ?? null,
      calorie: mealMenu.calorie ?? null,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
      schoolInfo: mealMenu.schoolInfo,
      components: mealMenu.mealMenuComponentMappings.map(
        (mapping) => mapping.mealMenuComponent.name,
      ),
      myReaction: myReactions.get(mealMenu.id) ?? null,
    };
  }

  private toDetailResponse(mealMenu: MealMenu): MealMenuDetailResponseDto {
    return {
      id: mealMenu.id,
      mealType: mealMenu.mealType,
      menuName: mealMenu.menuName,
      price: mealMenu.price ?? null,
      calorie: mealMenu.calorie ?? null,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
      schoolInfo: mealMenu.schoolInfo,
      components: mealMenu.mealMenuComponentMappings.map(
        (mapping) => mapping.mealMenuComponent.name,
      ),
    };
  }

  private toReactionResponse(
    actionType: ActionType,
    mealMenu: MealMenu,
  ): MealMenuReactionResponseDto {
    return {
      actionType,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
    };
  }
}
