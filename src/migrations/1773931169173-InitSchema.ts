import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1773931169173 implements MigrationInterface {
  name = 'InitSchema1773931169173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "post_categories" ("id" SERIAL NOT NULL, "name" character varying(50) NOT NULL, CONSTRAINT "PK_9c45c4e9fb6ebf296990e1d3972" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "post_likes" ("id" SERIAL NOT NULL, "user_id" integer, "post_id" integer, CONSTRAINT "UQ_8f64693922a9e8c4e2605850d0b" UNIQUE ("user_id", "post_id"), CONSTRAINT "PK_e4ac7cb9daf243939c6eabb2e0d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "posts" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "id" SERIAL NOT NULL, "title" character varying(150) NOT NULL, "content" text NOT NULL, "view_count" integer NOT NULL DEFAULT '0', "like_count" integer NOT NULL DEFAULT '0', "comment_count" integer NOT NULL DEFAULT '0', "user_id" integer, "category_id" integer, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comments" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "id" SERIAL NOT NULL, "content" text NOT NULL, "like_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "comment_likes" ("id" SERIAL NOT NULL, "user_id" integer, "comment_id" integer, CONSTRAINT "PK_2c299aaf1f903c45ee7e6c7b419" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."friends_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "friends" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "id" SERIAL NOT NULL, "status" "public"."friends_status_enum" NOT NULL DEFAULT 'PENDING', "requester_id" integer, "receiver_id" integer, CONSTRAINT "UQ_ca7109a4de6bb73ecf3ed3f9d29" UNIQUE ("requester_id", "receiver_id"), CONSTRAINT "PK_65e1b06a9f379ee5255054021e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lunch_menus_meal_type_enum" AS ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'ALL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lunch_menus" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "id" SERIAL NOT NULL, "school" character varying(100) NOT NULL, "meal_date" date NOT NULL, "meal_type" "public"."lunch_menus_meal_type_enum" NOT NULL, "title" character varying(255) NOT NULL, "price" integer, "calorie" integer, "like_count" integer NOT NULL DEFAULT '0', "dislike_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_51c7e08072f41c9247778cd81fa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lunch_menu_reactions_action_type_enum" AS ENUM('LIKE', 'DISLIKE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lunch_menu_reactions" ("id" SERIAL NOT NULL, "action_type" "public"."lunch_menu_reactions_action_type_enum" NOT NULL, "user_id" integer, "lunch_menu_id" integer, CONSTRAINT "UQ_432b360a7a3f6c8e00e1223541b" UNIQUE ("user_id", "lunch_menu_id"), CONSTRAINT "PK_2f98bbdb628e484170422cbc104" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rooms_room_type_enum" AS ENUM('MALE', 'FEMALE', 'ANY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rooms_status_enum" AS ENUM('OPEN', 'FULL', 'CLOSE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "rooms" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "description" text, "room_type" "public"."rooms_room_type_enum" NOT NULL, "capacity" integer NOT NULL, "min_age" integer NOT NULL, "max_age" integer NOT NULL, "place" character varying(100) NOT NULL, "lunch_at" TIMESTAMP NOT NULL, "status" "public"."rooms_status_enum" NOT NULL DEFAULT 'OPEN', "current_count" integer NOT NULL DEFAULT '1', "user_id" integer, CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "room_members" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" integer, "room_id" integer, CONSTRAINT "PK_4493fab0433f741b7cf842e6038" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."users_gender_enum" AS ENUM('MALE', 'FEMALE')`);
    await queryRunner.query(
      `CREATE TABLE "users" ("created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "id" SERIAL NOT NULL, "email" character varying(100) NOT NULL, "nickname" character varying(50) NOT NULL, "hashed_password" character varying NOT NULL, "birth_date" date NOT NULL, "gender" "public"."users_gender_enum" NOT NULL, "school" character varying(100) NOT NULL, "description" text, "mbti" character varying(4), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_ad02a1be8707004cb805a4b5023" UNIQUE ("nickname"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_likes" ADD CONSTRAINT "FK_9b9a7fc5eeff133cf71b8e06a7b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_likes" ADD CONSTRAINT "FK_b40d37469c501092203d285af80" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_c4f9a7bd77b489e711277ee5986" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ADD CONSTRAINT "FK_852f266adc5d67c40405c887b49" FOREIGN KEY ("category_id") REFERENCES "post_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_bdba9a10c64ff58d36b09e3ac45" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" ADD CONSTRAINT "FK_2073bf518ef7017ec19319a65e5" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friends" ADD CONSTRAINT "FK_890c2646c24c98422c19969b199" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friends" ADD CONSTRAINT "FK_14fa620ed445b7565c492e67ff6" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lunch_menu_reactions" ADD CONSTRAINT "FK_c09ac9f350bf61506257096ecda" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lunch_menu_reactions" ADD CONSTRAINT "FK_c22387b8750c593b52588d56a5f" FOREIGN KEY ("lunch_menu_id") REFERENCES "lunch_menus"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_members" ADD CONSTRAINT "FK_b2d15baf5b46ed9659bd71fbb43" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_members" ADD CONSTRAINT "FK_e6cf45f179a524427ddf8bacd8e" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "room_members" DROP CONSTRAINT "FK_e6cf45f179a524427ddf8bacd8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "room_members" DROP CONSTRAINT "FK_b2d15baf5b46ed9659bd71fbb43"`,
    );
    await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT "FK_ebd4d9c6a68f360a13a2f5a3ad3"`);
    await queryRunner.query(
      `ALTER TABLE "lunch_menu_reactions" DROP CONSTRAINT "FK_c22387b8750c593b52588d56a5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lunch_menu_reactions" DROP CONSTRAINT "FK_c09ac9f350bf61506257096ecda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friends" DROP CONSTRAINT "FK_14fa620ed445b7565c492e67ff6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friends" DROP CONSTRAINT "FK_890c2646c24c98422c19969b199"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" DROP CONSTRAINT "FK_2073bf518ef7017ec19319a65e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment_likes" DROP CONSTRAINT "FK_bdba9a10c64ff58d36b09e3ac45"`,
    );
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_852f266adc5d67c40405c887b49"`);
    await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_c4f9a7bd77b489e711277ee5986"`);
    await queryRunner.query(
      `ALTER TABLE "post_likes" DROP CONSTRAINT "FK_b40d37469c501092203d285af80"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_likes" DROP CONSTRAINT "FK_9b9a7fc5eeff133cf71b8e06a7b"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_gender_enum"`);
    await queryRunner.query(`DROP TABLE "room_members"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TYPE "public"."rooms_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rooms_room_type_enum"`);
    await queryRunner.query(`DROP TABLE "lunch_menu_reactions"`);
    await queryRunner.query(`DROP TYPE "public"."lunch_menu_reactions_action_type_enum"`);
    await queryRunner.query(`DROP TABLE "lunch_menus"`);
    await queryRunner.query(`DROP TYPE "public"."lunch_menus_meal_type_enum"`);
    await queryRunner.query(`DROP TABLE "friends"`);
    await queryRunner.query(`DROP TYPE "public"."friends_status_enum"`);
    await queryRunner.query(`DROP TABLE "comment_likes"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP TABLE "post_likes"`);
    await queryRunner.query(`DROP TABLE "post_categories"`);
  }
}
