import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { GetMealMenuRankingQueryDto } from './dto/get-meal-menu-ranking-query.dto';
import { MealMenuDetailResponseDto } from './dto/meal-menu-detail-response.dto';
import { MealMenuListResponseDto } from './dto/meal-menu-list-response.dto';
import { MealMenuReactionResponseDto } from './dto/meal-menu-reaction-response.dto';
import { MealMenusService } from './meal-menus.service';

@ApiTags('MealMenu')
@Controller('meal-menus')
export class MealMenusController {
  constructor(private readonly mealMenusService: MealMenusService) {}

  @Get()
  @ApiOperation({ summary: '학식 목록 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenus(@Query() query: GetMealMenuListQueryDto): Promise<MealMenuListResponseDto> {
    return this.mealMenusService.findMealMenus(query);
  }

  @Get('rankings')
  @ApiOperation({ summary: '학식 랭킹 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenuRankings(
    @Query() query: GetMealMenuRankingQueryDto,
  ): Promise<MealMenuListResponseDto> {
    return this.mealMenusService.findMealMenuRankings(query);
  }

  @Get(':mealMenuId')
  @ApiOperation({ summary: '학식 상세 조회' })
  @ApiOkResponse({ type: MealMenuDetailResponseDto })
  async findMealMenuById(
    @Param('mealMenuId', ParseIntPipe) mealMenuId: number,
  ): Promise<MealMenuDetailResponseDto> {
    return this.mealMenusService.findMealMenuById(mealMenuId);
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
    return this.mealMenusService.likeMealMenu(currentUser.userId, mealMenuId);
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
    return this.mealMenusService.dislikeMealMenu(currentUser.userId, mealMenuId);
  }
}
