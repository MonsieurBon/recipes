import { ErrorHandler, inject, Injectable, Injector } from '@angular/core';

import { NotificationService } from './notification.service';

/**
 * The application's single error notifier and catch-all. Anything reaching here — an uncaught
 * runtime error, a template failure, or an HTTP failure that no local handler caught — is by
 * definition unhandled, so it is logged and surfaces the one generic notification. Errors the user
 * can act on never arrive here: the forms catch their own contextual statuses (invalid credentials,
 * duplicate username) before they can bubble. The natural extension point for error reporting later.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  // Resolved lazily: this handler is instantiated very early in bootstrap, and pulling in the
  // snackbar stack (and its overlay dependencies) eagerly at that point risks a cyclic/premature
  // instantiation. The injector defers that to the first error.
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    console.error(error);
    this.injector.get(NotificationService).showGenericError();
  }
}
