import { getAtPath, setAtPath } from '../managers/QueryCacheManager/QueryCache.utils';

import type { QueryCacheManager } from '../managers/QueryCacheManager/QueryCache.manager';

const DEFAULT_REFETCH_THRESHOLD = 5;

export interface UsePaginatedCacheActionsConfig<TData, TItem> {
  cacher: QueryCacheManager<TData, TItem>;
  defaultPage?: number;
  refetchThreshold?: number;
  onNavigateToPage?: (page: number) => void;
  onClearSearch?: () => void;
  onRefetch?: () => void;
}

const usePaginatedCacheActions = <TData, TItem extends { id: string | number }>({
  cacher,
  defaultPage = 0,
  refetchThreshold = DEFAULT_REFETCH_THRESHOLD,
  onNavigateToPage,
  onClearSearch,
  onRefetch,
}: UsePaginatedCacheActionsConfig<TData, TItem>) => {
  const config = cacher.getConfig();
  const { queryClient, queryKey, itemsPath, pagination } = config;

  const currentPagePath = pagination?.currentPagePath ?? 'page';
  const pageSizePath = pagination?.pageSizePath ?? 'size';
  const totalElementsPath = pagination?.totalElementsPath ?? 'totalElements';
  const totalPagesPath = pagination?.totalPagesPath ?? 'totalPages';
  const numberOfElementsPath = pagination?.numberOfElementsPath ?? 'numberOfElements';

  const add = (item: TItem): void => {
    onClearSearch?.();
    onNavigateToPage?.(1);

    queryClient.setQueriesData<any>({ queryKey }, (old: any) => {
      if (!old) return old;

      const currentPage = getAtPath<number>(old, currentPagePath, 1);

      if (currentPage !== defaultPage) return old;

      const items = getAtPath<TItem[]>(old, itemsPath, []);
      const totalElements = getAtPath<number>(old, totalElementsPath, 0);
      const pageSize = getAtPath<number>(old, pageSizePath, 10);
      const newTotal = totalElements + 1;
      const newItems = [item, ...items];

      let result = { ...old };

      result = setAtPath(result, itemsPath, newItems);
      result = setAtPath(result, totalElementsPath, newTotal);
      result = setAtPath(result, totalPagesPath, Math.ceil(newTotal / pageSize));
      result = setAtPath(result, numberOfElementsPath, newItems.length);

      return result;
    });
  };

  const update = (item: TItem): void => {
    queryClient.setQueriesData<any>({ queryKey }, (old: any) => {
      if (!old) return old;

      const items = getAtPath<TItem[]>(old, itemsPath, []);
      const index = items.findIndex((i) => i.id === item.id);

      if (index === -1) return old;

      const newItems = [...items];

      newItems[index] = item;

      return setAtPath({ ...old }, itemsPath, newItems);
    });
  };

  const remove = (id: string | number): void => {
    let shouldRefetch = false;

    queryClient.setQueriesData<any>({ queryKey }, (old: any) => {
      if (!old) return old;

      const items = getAtPath<TItem[]>(old, itemsPath, []);
      const index = items.findIndex((i) => i.id === id);

      if (index === -1) return old;

      const newItems = items.filter((i) => i.id !== id);
      const currentPage = getAtPath<number>(old, currentPagePath, 1);
      const totalElements = getAtPath<number>(old, totalElementsPath, 0);
      const pageSize = getAtPath<number>(old, pageSizePath, 10);
      const totalPages = getAtPath<number>(old, totalPagesPath, 1);
      const newTotal = Math.max(0, totalElements - 1);
      const newTotalPages = Math.ceil(newTotal / pageSize);

      if (newItems.length === 0 && currentPage > 1) {
        onNavigateToPage?.(currentPage - 1);
      } else if (newItems.length > 0 && newItems.length <= refetchThreshold && totalPages > currentPage) {
        shouldRefetch = true;
      }

      let result = { ...old };

      result = setAtPath(result, itemsPath, newItems);
      result = setAtPath(result, totalElementsPath, newTotal);
      result = setAtPath(result, totalPagesPath, newTotalPages);
      result = setAtPath(result, numberOfElementsPath, newItems.length);

      return result;
    });

    if (shouldRefetch) onRefetch?.();
  };

  return { add, update, remove };
};

export default usePaginatedCacheActions;
