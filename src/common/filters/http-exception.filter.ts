// src/common/filters/http-exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';


interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {

  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string };
        message = body.message ?? exception.message;
        error = body.error ?? exception.name;
      }

      if (
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN
      ) {
        const authedRequest = request as Request & {
          user?: { id?: string };
          ip?: string;
        };
        const userId = authedRequest.user?.id ?? 'anonymous';
        const ip = authedRequest.ip ?? request.socket?.remoteAddress ?? '-';
        this.logger.warn(
          `AUTH-DENY ${status} ${request.method} ${request.url} ` +
            `ip=${ip} userId=${userId}`,
        );
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Error no controlado en ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(body);
  }
}
