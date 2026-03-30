import { MigrationInterface, QueryRunner } from "typeorm";

export class RenamecurrentCountInRoomcurrentMembersCount1774419746175 implements MigrationInterface {
    name = 'RenamecurrentCountInRoomcurrentMembersCount1774419746175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "current_count" TO "current_members_count"`);
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "current_members_count" TO "current_count"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "current_count"`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD "current_members_count" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD "current_count" integer NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "current_count"`);
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "current_members_count"`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD "current_count" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "current_count" TO "current_members_count"`);
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "current_members_count" TO "current_count"`);
    }

}
