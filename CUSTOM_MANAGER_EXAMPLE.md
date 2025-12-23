# Custom Cache Manager

Extend `QueryCacheManager` with your own logic and use it globally.

## Quick Start

### 1. Create Custom Manager

```typescript
import { QueryCacheManager, type CacheConfig, type InsertPosition } from 'tanstack-cachify';

export class MyCustomManager<TData, TItem> extends QueryCacheManager<TData, TItem> {
  // These override methods are optional (you can just simply extend the class)
  override add(newItem: TItem, position: InsertPosition = 'start'): void {
    super.add(newItem, position);
    Logger.error(adda)
    amplitude.post()
  }

  override update(updatedItem: Partial<TItem>): void {
    super.update(updatedItem);
  }

  override delete(itemOrId: TItem | string | number): void {
    // you can write here extra like analytics or loggers if you want
    super.delete(itemOrId);
  }
}
```

### 2. Configure Once (App Startup)

```typescript
import { cacheManagerFactory } from 'tanstack-cachify';
import { MyCustomManager } from './cache/MyCustomManager';

cacheManagerFactory.setManagerClass(MyCustomManager);
```

### 3. Use Everywhere

```typescript
const mutation = useCustomMutation({
  mutationFn: createUser,
  cacheActions: {
    type: 'add',
    queryKey: ['users'],
  }
});
```

That's it! All mutations now use `MyCustomManager` automatically.

## Real World Examples

### Analytics Tracking

```typescript
import { QueryCacheManager } from 'tanstack-cachify';
import { analytics } from './analytics';

export class AnalyticsManager<TData, TItem> extends QueryCacheManager<TData, TItem> {
  override add(newItem: TItem, position = 'start') {
    analytics.track('cache_add', { item: newItem });
    super.add(newItem, position);
  }

  override delete(itemOrId: TItem | string | number) {
    analytics.track('cache_delete', { id: itemOrId });
    super.delete(itemOrId);
  }
}
```

### Validation

```typescript
export class ValidatingManager<TData, TItem> extends QueryCacheManager<TData, TItem> {
  override add(newItem: TItem, position = 'start') {
    if (!this.isValid(newItem)) {
      throw new Error('Invalid item');
    }
    super.add(newItem, position);
  }

  private isValid(item: TItem): boolean {
    return item !== null && item !== undefined;
  }
}
```

### Error Tracking

```typescript
export class ErrorTrackingManager<TData, TItem> extends QueryCacheManager<TData, TItem> {
  override add(newItem: TItem, position = 'start') {
    try {
      super.add(newItem, position);
    } catch (error) {
      errorService.log(error);
      throw error;
    }
  }
}
```

## API

```typescript
import { cacheManagerFactory } from 'tanstack-cachify';

cacheManagerFactory.setManagerClass(MyCustomManager);
cacheManagerFactory.resetManagerClass();
const CurrentClass = cacheManagerFactory.getManagerClass();
```
