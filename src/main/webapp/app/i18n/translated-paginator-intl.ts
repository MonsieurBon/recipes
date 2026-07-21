import { inject, Injectable, OnDestroy } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

/**
 * Supplies the Material paginator's labels from the active translation bundle and refreshes them
 * whenever the user switches language, so the range text and control tooltips stay localized.
 */
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl implements OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly langChange: Subscription;

  constructor() {
    super();
    this.applyLabels();
    this.langChange = this.translate.onLangChange.subscribe(() => this.applyLabels());
  }

  ngOnDestroy(): void {
    this.langChange.unsubscribe();
  }

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0) {
      return this.translate.instant('paginator.rangeEmpty');
    }
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, length);
    return this.translate.instant('paginator.range', { start, end, length });
  };

  private applyLabels(): void {
    this.itemsPerPageLabel = this.translate.instant('paginator.itemsPerPage');
    this.nextPageLabel = this.translate.instant('paginator.nextPage');
    this.previousPageLabel = this.translate.instant('paginator.previousPage');
    this.firstPageLabel = this.translate.instant('paginator.firstPage');
    this.lastPageLabel = this.translate.instant('paginator.lastPage');
    this.changes.next();
  }
}
