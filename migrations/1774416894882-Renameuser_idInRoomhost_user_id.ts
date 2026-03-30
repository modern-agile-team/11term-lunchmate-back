import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameuserIdInRoomhostUserId1774416894882 implements MigrationInterface {
    name = 'RenameuserIdInRoomhostUserId1774416894882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3"`);
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "user_id" TO "host_user_id"`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_08815b6b09a529e7ef5bcf3c492" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_08815b6b09a529e7ef5bcf3c492"`);
        await queryRunner.query(`ALTER TABLE "rooms" RENAME COLUMN "host_user_id" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
