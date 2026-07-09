import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Mocked } from 'vitest';

import { GlobalErrorHandler } from './global-error-handler';
import { NotificationService } from './notification.service';

describe('GlobalErrorHandler', () => {
  let notification: Mocked<Pick<NotificationService, 'showGenericError'>>;
  let handler: GlobalErrorHandler;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    notification = { showGenericError: vi.fn() };
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: NotificationService, useValue: notification }],
    });
    handler = TestBed.inject(GlobalErrorHandler);
  });

  afterEach(() => consoleError.mockRestore());

  it('logs and notifies for a non-HTTP error', () => {
    const error = new Error('boom');

    handler.handleError(error);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(notification.showGenericError).toHaveBeenCalledOnce();
  });

  it('logs and notifies for an HttpErrorResponse too — reaching here means no one handled it', () => {
    const error = new HttpErrorResponse({ status: 500 });

    handler.handleError(error);

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(notification.showGenericError).toHaveBeenCalledOnce();
  });
});
