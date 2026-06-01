import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropMealDateFromMealMenus1780310400000 implements MigrationInterface {
  name = 'DropMealDateFromMealMenus1780310400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "meal_menus" DROP COLUMN "meal_date"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meal_menus" ADD "meal_date" date NOT NULL DEFAULT CURRENT_DATE`,
    );
    await queryRunner.query(`ALTER TABLE "meal_menus" ALTER COLUMN "meal_date" DROP DEFAULT`);
  }
}
