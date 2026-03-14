'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseTopMenuFocusAndSearchArgs = {
  initialSearchQuery: string;
  onSearchCommit: (value: string) => void;
};

export function useTopMenuFocusAndSearch({ initialSearchQuery, onSearchCommit }: UseTopMenuFocusAndSearchArgs) {
  const [searchDraft, setSearchDraft] = useState(initialSearchQuery);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const addStreamInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceTimerRef = useRef<number | null>(null);
  const focusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchDraft(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current != null) {
        window.clearTimeout(searchDebounceTimerRef.current);
      }
      if (focusTimerRef.current != null) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  const scheduleFocus = useCallback((target: 'search' | 'addStream', delay = 30) => {
    if (focusTimerRef.current != null) {
      window.clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = window.setTimeout(() => {
      if (target === 'search') {
        searchInputRef.current?.focus();
      } else {
        addStreamInputRef.current?.focus();
      }
    }, delay);
  }, []);

  const onSearchDraftChange = useCallback((value: string) => {
    setSearchDraft(value);
    if (searchDebounceTimerRef.current != null) {
      window.clearTimeout(searchDebounceTimerRef.current);
    }
    searchDebounceTimerRef.current = window.setTimeout(() => {
      onSearchCommit(value);
    }, 90);
  }, [onSearchCommit]);

  const clearSearch = useCallback(() => {
    if (searchDebounceTimerRef.current != null) {
      window.clearTimeout(searchDebounceTimerRef.current);
    }
    setSearchDraft('');
    onSearchCommit('');
  }, [onSearchCommit]);

  return {
    searchDraft,
    searchInputRef,
    addStreamInputRef,
    scheduleFocus,
    onSearchDraftChange,
    clearSearch
  };
}
