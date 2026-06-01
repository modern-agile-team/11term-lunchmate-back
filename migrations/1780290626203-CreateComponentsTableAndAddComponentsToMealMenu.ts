import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateComponentsTableAndAddComponentsToMealMenu1780290626203 implements MigrationInterface {
    name = 'CreateComponentsTableAndAddComponentsToMealMenu1780290626203'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "meal_menu_components" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "meal_menu_id" integer, CONSTRAINT "PK_03541d708c02cde0bef101d7bd8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "meal_menus" ADD "meal_date" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "meal_menu_components" ADD CONSTRAINT "FK_dc3d6a83a32da0525e3bb16929e" FOREIGN KEY ("meal_menu_id") REFERENCES "meal_menus"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meal_menu_components" DROP CONSTRAINT "FK_dc3d6a83a32da0525e3bb16929e"`);
        await queryRunner.query(`ALTER TABLE "meal_menus" DROP COLUMN "meal_date"`);
        await queryRunner.query(`DROP TABLE "meal_menu_components"`);
    }

}
