import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1774314591445 implements MigrationInterface {
    name = 'InitSchema1774314591445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "max_capacity" TO "max_members_count"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "max_members_count" TO "max_capacity"`);
    }

}
