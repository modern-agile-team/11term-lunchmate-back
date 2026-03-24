import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuReaction } from './entities/meal-menu-reaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MealMenu, MealMenuReaction])],
  controllers: [],
  providers: [],
})
export class MealMenuModule {}
