import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterNameInPostCategory1775636985945 implements MigrationInterface {
    name = 'AlterNameInPostCategory1775636985945'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_categories" ADD CONSTRAINT "UQ_235ee0669c727771807c7f8d389" UNIQUE ("name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_categories" DROP CONSTRAINT "UQ_235ee0669c727771807c7f8d389"`);
    }

}
