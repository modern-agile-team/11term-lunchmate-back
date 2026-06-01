import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuReaction } from './entities/meal-menu-reaction.entity';
import { MealMenusController } from './meal-menus.controller';
import { MealMenuRepository } from './meal-menus.repository';
import { MealMenusService } from './meal-menus.service';
import { MealMenuComponent } from './entities/meal-menu-component.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MealMenu, MealMenuReaction, MealMenuComponent]), AuthModule],
  controllers: [MealMenusController],
  providers: [MealMenuRepository, MealMenusService],
})
export class MealMenuModule {}
