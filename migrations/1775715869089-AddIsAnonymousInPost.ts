import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAnonymousInPost1775715869089 implements MigrationInterface {
    name = 'AddIsAnonymousInPost1775715869089'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" ADD "is_anonymous" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "is_anonymous"`);
    }

}
