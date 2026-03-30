import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameschoolToschoolInfo1774593655140 implements MigrationInterface {
    name = 'RenameschoolToschoolInfo1774593655140'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "school" TO "school_info"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "current_count"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" ADD "current_count" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "school_info" TO "school"`);
    }

}
