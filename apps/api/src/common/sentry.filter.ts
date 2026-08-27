import * as Sentry from '@sentry/node';
import { Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(SentryFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        if (exception instanceof HttpException) {
          const status = exception.getStatus();
          scope.setExtra('statusCode', status);
          // Don't report client errors (4xx) to Sentry
          if (status >= 400 && status < 500) return;
        }
        Sentry.captureException(exception);
      });
    }

    // Log the error regardless
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    // Safely call super — applicationRef may not be set during bootstrap errors
    try {
      super.catch(exception, host);
    } catch {
      // Swallow errors from the base filter if the app ref is not ready
    }
  }
}
