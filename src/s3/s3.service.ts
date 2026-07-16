import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ImageResponseDto } from './dto/s3.dto';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_KEY'),
      },
    });
  }

  async uploadImage(userId: number, file: Express.Multer.File): Promise<ImageResponseDto> {
    const key = `profile-images/${userId}_${Date.now()}_${randomUUID()}${extname(file.originalname)}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      imageURL: `${this.baseUrl}${key}`,
    };
  }

  async deleteImage(imageUrl: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: this.extractKey(imageUrl),
      }),
    );
  }

  isS3Url(imageUrl: string): boolean {
    return imageUrl.startsWith(this.baseUrl);
  }

  private get baseUrl(): string {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/`;
  }

  private extractKey(imageUrl: string): string {
    return imageUrl.slice(this.baseUrl.length);
  }
}
