import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Response, Request } from 'express';
import { Logger } from 'winston';
import dayjs from 'dayjs';

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as Record<string, object>).message || exception.message
        : exception instanceof Error
          ? exception.message
          : 'Internal Server Error';

    const response = {
      success: false,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      path: `${req.method} ${req.path}`,
      error: {
        statusCode: status,
        message,
      },
    };

    const logContext = {
      ...response,
      stack: (exception as Error).stack,
    };

    if (status >= 500) this.logger.error('[Exception', logContext);
    else this.logger.warn(`[Exception] ${req.method} ${req.path}`, response);

    res.status(status).json(response);
  }
}
