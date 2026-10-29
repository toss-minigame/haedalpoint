import type { ApiErrorResponse } from '@haedalpoint/shared';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const raw =
        typeof body === 'string' ? body : (body as { message?: string | string[] }).message;
      message = Array.isArray(raw) ? raw.join(', ') : (raw ?? exception.message);
    } else {
      this.logger.error(exception);
    }

    const payload: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(payload);
  }
}
