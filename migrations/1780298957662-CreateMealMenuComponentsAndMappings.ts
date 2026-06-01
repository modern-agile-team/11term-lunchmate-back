import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMealMenuComponentsAndMappings1780298957662 implements MigrationInterface {
    name = 'CreateMealMenuComponentsAndMappings1780298957662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meal_menu_components" DROP CONSTRAINT "FK_dc3d6a83a32da0525e3bb16929e"`);
        await queryRunner.query(`CREATE TABLE "meal_menu_component_mappings" ("id" SERIAL NOT NULL, "meal_menu_id" integer, "meal_menu_component_id" integer, CONSTRAINT "UQ_6a785d7c12134d7a484e7d74780" UNIQUE ("meal_menu_id", "meal_menu_component_id"), CONSTRAINT "PK_eb7645a1e48e32fedc324c295ee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "meal_menu_components" DROP COLUMN "meal_menu_id"`);
        await queryRunner.query(`ALTER TABLE "meal_menu_component_mappings" ADD CONSTRAINT "FK_12a72728bf6fe8e8b01784b0622" FOREIGN KEY ("meal_menu_id") REFERENCES "meal_menus"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meal_menu_component_mappings" ADD CONSTRAINT "FK_7fc160941e4440e257f125c3074" FOREIGN KEY ("meal_menu_component_id") REFERENCES "meal_menu_components"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meal_menu_component_mappings" DROP CONSTRAINT "FK_7fc160941e4440e257f125c3074"`);
        await queryRunner.query(`ALTER TABLE "meal_menu_component_mappings" DROP CONSTRAINT "FK_12a72728bf6fe8e8b01784b0622"`);
        await queryRunner.query(`ALTER TABLE "meal_menu_components" ADD "meal_menu_id" integer`);
        await queryRunner.query(`DROP TABLE "meal_menu_component_mappings"`);
        await queryRunner.query(`ALTER TABLE "meal_menu_components" ADD CONSTRAINT "FK_dc3d6a83a32da0525e3bb16929e" FOREIGN KEY ("meal_menu_id") REFERENCES "meal_menus"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
