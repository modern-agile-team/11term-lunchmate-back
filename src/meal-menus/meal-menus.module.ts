import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuReaction } from './entities/meal-menu-reaction.entity';
import { MealMenusController } from './meal-menus.controller';
import { MealMenuRepository } from './meal-menus.repository';
import { MealMenusService } from './meal-menus.service';

@Module({
  imports: [TypeOrmModule.forFeature([MealMenu, MealMenuReaction])],
  controllers: [MealMenusController],
  providers: [MealMenuRepository, MealMenusService],
})
export class MealMenuModule {}
