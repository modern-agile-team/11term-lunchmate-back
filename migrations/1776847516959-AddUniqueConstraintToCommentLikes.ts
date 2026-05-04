import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToCommentLikes1776847516959 implements MigrationInterface {
    name = 'AddUniqueConstraintToCommentLikes1776847516959'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comment_likes" ADD CONSTRAINT "UQ_660059072f131c773be5f37c475" UNIQUE ("user_id", "comment_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comment_likes" DROP CONSTRAINT "UQ_660059072f131c773be5f37c475"`);
    }

}
