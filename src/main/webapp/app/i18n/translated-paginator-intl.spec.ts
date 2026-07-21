import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { Mock } from 'vitest';

import { TranslatedPaginatorIntl } from './translated-paginator-intl';

describe('TranslatedPaginatorIntl', () => {
  let onLangChange: Subject<unknown>;
  let instant: Mock<(key: string, params?: object) => string>;
  let intl: TranslatedPaginatorIntl;

  beforeEach(() => {
    onLangChange = new Subject();
    instant = vi.fn((key: string, params?: object) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: { instant, onLangChange } },
        TranslatedPaginatorIntl,
      ],
    });
    intl = TestBed.inject(TranslatedPaginatorIntl);
  });

  it('translates the static labels', () => {
    expect(intl.itemsPerPageLabel).toBe('paginator.itemsPerPage');
    expect(intl.nextPageLabel).toBe('paginator.nextPage');
    expect(intl.previousPageLabel).toBe('paginator.previousPage');
    expect(intl.firstPageLabel).toBe('paginator.firstPage');
    expect(intl.lastPageLabel).toBe('paginator.lastPage');
  });

  it('builds the range label for a full page', () => {
    expect(intl.getRangeLabel(1, 20, 42)).toBe('paginator.range:{"start":21,"end":40,"length":42}');
  });

  it('clamps the range end on the last, partial page', () => {
    expect(intl.getRangeLabel(2, 20, 42)).toBe('paginator.range:{"start":41,"end":42,"length":42}');
  });

  it('uses the empty range label when there are no items', () => {
    expect(intl.getRangeLabel(0, 20, 0)).toBe('paginator.rangeEmpty');
  });

  it('re-translates and re-emits when the active language changes', () => {
    const changed = vi.fn();
    intl.changes.subscribe(changed);
    instant.mockClear();

    onLangChange.next({ lang: 'fr' });

    expect(instant).toHaveBeenCalledWith('paginator.nextPage');
    expect(changed).toHaveBeenCalledOnce();
  });
});
