import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHostUserIdToRoom1775114078934 implements MigrationInterface {
    name = 'AddHostUserIdToRoom1775114078934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" ADD "post_id" integer`);
        await queryRunner.query(`ALTER TABLE "comments" ADD "user_id" integer`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_259bf9825d9d198608d1b46b0b5" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_259bf9825d9d198608d1b46b0b5"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN "post_id"`);
    }

}
