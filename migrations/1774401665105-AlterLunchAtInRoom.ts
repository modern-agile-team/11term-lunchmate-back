import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterLunchAtInRoom1774401665105 implements MigrationInterface {
    name = 'AlterLunchAtInRoom1774401665105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3"`);
        await queryRunner.query(`ALTER TABLE "rooms" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "rooms" ADD CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
