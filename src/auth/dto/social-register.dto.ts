import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Mbti, UserGender } from 'src/users/types/user.type';

export class SocialRegisterDto {
  @ApiProperty({ example: 'lunchmate' })
  @IsString()
  @IsNotEmpty()
  nickname!: string;

  @ApiProperty({ example: '1999-01-01' })
  @IsDateString()
  @IsNotEmpty()
  birthDate!: string;

  @ApiProperty({ enum: UserGender, example: UserGender.MALE })
  @IsEnum(UserGender)
  @IsNotEmpty()
  gender!: UserGender;

  @ApiProperty({ required: false, example: '인덕대학교 컴소과' })
  @IsString()
  @IsOptional()
  schoolInfo?: string;

  @ApiProperty({ required: false, example: '오늘 점심 메이트 구해요.' })
  @IsString()
  @IsOptional()
  introduce?: string;

  @ApiProperty({ required: false, enum: Mbti, example: Mbti.ENFP })
  @IsEnum(Mbti)
  @IsOptional()
  mbti?: Mbti;
}
