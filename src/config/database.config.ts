import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { newDb } from 'pg-mem';

@Injectable()
export class TypeOrmConfig implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}
  createTypeOrmOptions(): Promise<TypeOrmModuleOptions> | TypeOrmModuleOptions {
    const isTestEnvironment =
      this.configService.get<string>('NODE_ENV') === 'test' ||
      Boolean(this.configService.get<string>('JEST_WORKER_ID'));

    if (isTestEnvironment) {
      return {
        type: 'postgres',
        entities: [__dirname + '/../**/entities/*.entity{.ts,.js}'],
        synchronize: true,
        dropSchema: true,
        logging: false,
        dataSourceFactory: async (
          options?: TypeOrmModuleOptions,
        ): Promise<DataSource> => {
          const db = newDb({
            autoCreateForeignKeyIndices: true,
          });

          db.public.registerFunction({
            name: 'current_database',
            implementation: () => 'lunchmate_test',
          });

          db.public.registerFunction({
            name: 'version',
            implementation: () => 'PostgreSQL 16.0',
          });

          const dataSource = db.adapters.createTypeormDataSource(
            options as DataSourceOptions,
          );

          if (!dataSource.isInitialized) {
            await dataSource.initialize();
          }

          return dataSource;
        },
      } as TypeOrmModuleOptions;
    }

    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST'),
      port: Number(this.configService.get<string>('DB_PORT', '5432')),
      username: this.configService.get<string>('DB_USERNAME'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_DATABASE'),
      entities: [__dirname + '/../**/entities/*.entity{.ts,.js}'],
      synchronize: false,
      logging: true,
    };
  }
}
