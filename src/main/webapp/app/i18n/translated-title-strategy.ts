import { DestroyRef, inject, Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

/**
 * Resolves route titles through ngx-translate. Each route's {@code title} is a translation key; the
 * document title becomes "{app name} - {page}" in the active language and is retranslated live when
 * the language changes, so a switch updates the tab title without a navigation.
 *
 * {@link TranslateService} is resolved lazily, on the first title update, rather than injected in the
 * constructor: the Router builds this strategy while it is itself being constructed, and eagerly
 * pulling in TranslateService there would trigger its fallback-bundle HTTP load through the auth
 * interceptor, which injects the Router — a construction cycle. Deferring the lookup breaks it.
 */
@Injectable({
  providedIn: 'root',
})
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly title = inject(Title);

  private translate?: TranslateService;
  private titleKey?: string;

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.titleKey = this.buildTitle(snapshot);
    this.applyTitle();
  }

  private applyTitle(): void {
    const translate = this.resolveTranslate();
    const appName = translate.instant('app.title');
    this.title.setTitle(
      this.titleKey === undefined ? appName : `${appName} - ${translate.instant(this.titleKey)}`,
    );
  }

  private resolveTranslate(): TranslateService {
    if (!this.translate) {
      this.translate = this.injector.get(TranslateService);
      this.translate.onLangChange
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.applyTitle());
    }
    return this.translate;
  }
}
