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


# Using `useCustomMutation` with `CacheProvider`

Provide global cache and notification behavior to your mutations with `CacheProvider` and `useCustomMutation`.

## Scenario

Suppose you are building an admin panel where users can create new units. You want to:

- Automatically update the cache when a unit is created.
- Show success or error notifications without repeating logic in every component.

---

## Step 1: Wrap Your App with `CacheProvider`

At the top level of your app, you wrap your components with `CacheProvider`.  

- The provider receives functions to show success and error messages.
- It can also include a helper to extract error messages from API responses.
- All components inside this provider automatically use these behaviors.

```typescript

const withTanstackCacher: HOC = (Component) => (props) => {
  const { showSuccess, showError } = useNotify()
  
  const getErrorMessage = (error) => {
    return error.message.data
  }

  return (
    <CacheProvider config={{ showError, showSuccess, getErrorMessage }}>
      <Component {...props} />
    </CacheProvider>
  )
}

```
---

## Step 2: Create a Custom Mutation Hook

You define a mutation hook, for example, `useExampleCreateUnit`:

- The hook knows which API function to call, such as `createUnit`.
- It interacts with the cache, so the UI updates automatically when the mutation succeeds.
- Notifications are triggered automatically based on the global logic from `CacheProvider`.

```typescript
const useCreateUnit = (
  options?: CustomMutationOptionsNoFn<CreateResponse, ApiErrorResponse, CreateDto>
) => {
  return useCustomMutation<CreateResponse, ApiErrorResponse, CreateDto>({
    mutationKey: [QueryKeys.CREATE_UNIT],
    mutationFn: (data: CreateDto) => createUnit(data),
    notify: true,
    ...options,
  });
};
```
---

## Step 3: Use the Hook in Components

In your form component:

- Call the custom mutation hook when submitting the form.
- The mutation automatically updates the cache and shows notifications.
- No extra success/error handling is needed in the component itself.

---

## Key Benefits

- **Global consistency:** All mutations share the same notification and cache behavior.
- **Less boilerplate:** Components only call the mutation without extra logic.
- **Flexible:** You can still pass local options to `useCustomMutation` for special cases.
