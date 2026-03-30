import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { MealMenuListResponseDto } from './dto/meal-menu-list-response.dto';
import { MealMenusService } from './meal-menus.service';

@ApiTags('MealMenu')
@Controller('meal-menus')
export class MealMenusController {
  constructor(private readonly mealMenusService: MealMenusService) {}

  @Get()
  @ApiOperation({ summary: '학식 목록 조회' })
  @ApiOkResponse({ type: MealMenuListResponseDto })
  async findMealMenus(
    @Query() query: GetMealMenuListQueryDto,
  ): Promise<MealMenuListResponseDto> {
    return this.mealMenusService.findMealMenus(query);
  }
}
