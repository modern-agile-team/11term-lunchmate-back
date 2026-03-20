import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LunchMenu } from './entities/lunch-menu.entity';
import { LunchMenuReaction } from './entities/lunch-menu-reaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LunchMenu, LunchMenuReaction])],
  controllers: [],
  providers: [],
})
export class LunchMenuModule {}
