import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterHostUserIdInRoom1775114685192 implements MigrationInterface {
    name = 'AlterHostUserIdInRoom1775114685192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_08815b6b09a529e7ef5bcf3c492"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "host_user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_08815b6b09a529e7ef5bcf3c492" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_08815b6b09a529e7ef5bcf3c492"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "host_user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_08815b6b09a529e7ef5bcf3c492" FOREIGN KEY ("host_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
