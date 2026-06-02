import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
import { UserRole } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/auth/guards/role.guard';
import { CreateMealMenuDto } from './dto/create-meal-menu.dto';

@ApiTags('MealMenu')
@Controller('meal-menus')
export class MealMenusController {
  constructor(private readonly mealMenusService: MealMenusService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async createMealMenu(
    @Body() createMealMenuDto: CreateMealMenuDto,
  ): Promise<MealMenuDetailResponseDto> {
    const newMealMenu = await this.mealMenusService.createMealMenu(createMealMenuDto);

    return this.toDetailResponse(newMealMenu);
  }

  @Get()
  @ApiOperation({ summary: '학식 목록 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenus(@Query() query: GetMealMenuListQueryDto): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenusService.findMealMenus(query);
    return this.toListResponse(mealMenus);
  }

  @Get('rankings')
  @ApiOperation({ summary: '학식 랭킹 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenuRankings(
    @Query() query: GetMealMenuRankingQueryDto,
  ): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenusService.findMealMenuRankings(query);
    return this.toListResponse(mealMenus);
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

  private toListResponse(mealMenus: MealMenu[]): MealMenuListResponseDto {
    return {
      items: mealMenus.map((mealMenu) => this.toListItem(mealMenu)),
    };
  }

  private toListItem(mealMenu: MealMenu): MealMenuListItemResponseDto {
    return {
      id: mealMenu.id,
      mealType: mealMenu.mealType,
      menuName: mealMenu.menuName,
      price: mealMenu.price ?? null,
      calorie: mealMenu.calorie ?? null,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
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
