# React Query Cache Manager

> Flexible cache management for React Query with optimistic updates

A simple, TypeScript-first utility for managing React Query cache. Works with **any response structure** - simple arrays, nested data, paginated responses, or custom formats.

## Features

- ✅ **Works with any API response format** - You define how to get/set items
- ✅ **Full TypeScript support**
- ✅ **Optimistic updates** made simple
- ✅ **Tree-shakeable** ESM and CJS builds
- ✅ **Tiny** - Only ~3.5KB
- ✅ **Zero dependencies** (except peer deps)

## Installation

**Peer Dependencies:**
- `@tanstack/react-query` v4 or v5
- `react` v16.8+

## Quick Start

### 1. Simple Array Response

```typescript
import { QueryCacheManager } from '@your-scope/react-query-cache-manager';
import { useQueryClient, useMutation } from '@tanstack/react-query';

interface Todo {
  id: string;
  title: string;
}

// API returns: Todo[]
function TodoList() {
  const queryClient = useQueryClient();

  const cache = new QueryCacheManager<Todo[], Todo>({
    queryClient,
    queryKey: ['todos'],
    getItems: (data) => data,              // data is already array
    setItems: (data, items) => items,      // just return the items
  });

  const createMutation = useMutation({
    mutationFn: createTodo,
    onMutate: (newTodo) => cache.create(newTodo),
    onError: () => cache.invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: updateTodo,
    onMutate: (todo) => cache.update(todo),
    onError: () => cache.invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTodo,
    onMutate: (id) => cache.delete(id),
    onError: () => cache.invalidate(),
  });
}
```

### 2. Nested Response

```typescript
interface ApiResponse {
  success: true;
  data: {
    items: User[];
  };
}

const cache = new QueryCacheManager<ApiResponse, User>({
  queryClient,
  queryKey: ['users'],
  getItems: (data) => data.data.items,
  setItems: (data, items) => ({
    ...data,
    data: { ...data.data, items }
  }),
});
```

### 3. Paginated Response

```typescript
interface PaginatedResponse {
  content: User[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

const cache = new QueryCacheManager<PaginatedResponse, User>({
  queryClient,
  queryKey: ['users', { page: 0 }],
  getItems: (data) => data.content,
  setItems: (data, items) => ({ ...data, content: items }),
  // Update totalElements when adding items
  onItemsAdd: (data, count) => ({
    ...data,
    page: {
      ...data.page,
      totalElements: data.page.totalElements + count,
      totalPages: Math.ceil((data.page.totalElements + count) / data.page.size)
    }
  }),
  // Update totalElements when removing items
  onItemsRemove: (data, count) => ({
    ...data,
    page: {
      ...data.page,
      totalElements: Math.max(0, data.page.totalElements - count),
      totalPages: Math.ceil(Math.max(0, data.page.totalElements - count) / data.page.size)
    }
  }),
});
```

### 4. Custom Response Format

```typescript
// Your unique API format
interface CustomResponse {
  status: 'ok';
  result: {
    list: Product[];
    meta: {
      count: number;
    };
  };
}

const cache = new QueryCacheManager<CustomResponse, Product>({
  queryClient,
  queryKey: ['products'],
  getItems: (data) => data.result.list,
  setItems: (data, items) => ({
    ...data,
    result: {
      ...data.result,
      list: items,
      meta: { ...data.result.meta, count: items.length }
    }
  }),
});
```

## API Reference

### Constructor

```typescript
new QueryCacheManager<TData, TItem>(config)
```

**Config Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `queryClient` | `QueryClient` | Yes | React Query client instance |
| `queryKey` | `QueryKey` | Yes | Query key for the cache |
| `getItems` | `(data: TData) => TItem[]` | Yes | Extract items array from your response |
| `setItems` | `(data: TData, items: TItem[]) => TData` | Yes | Update response with new items array |
| `keyExtractor` | `(item: TItem) => string \| number` | No | Extract unique ID (default: `item.id`) |
| `onItemsAdd` | `(data: TData, count: number) => TData` | No | Update metadata after adding items |
| `onItemsRemove` | `(data: TData, count: number) => TData` | No | Update metadata after removing items |

### Methods

#### `create(newItem, position?)`
Add new item to cache
```typescript
cache.create({ id: '1', name: 'John' });
cache.create({ id: '2', name: 'Jane' }, 'end');
```

#### `update(updatedItem, matcher?)`
Update existing item
```typescript
// Update by ID (default)
cache.update({ id: '1', name: 'Johnny' });

// Custom matcher
cache.update(
  { status: 'active' },
  (item) => item.email === 'user@example.com'
);
```

#### `delete(itemOrId, matcher?)`
Remove item from cache
```typescript
// Delete by ID
cache.delete('1');

// Delete by object
cache.delete({ id: '1', name: 'John' });

// Custom matcher
cache.delete(null, (item) => item.isDeleted);
```

#### `replace(newData)`
Replace entire cache data
```typescript
cache.replace(newFullData);
```

#### `invalidate()`
Trigger refetch from server
```typescript
cache.invalidate();
```

#### `createHandlers()`
Get handlers for mutation callbacks
```typescript
const handlers = cache.createHandlers();

useMutation({
  mutationFn: createUser,
  onMutate: handlers.onCreate,
  onError: () => cache.invalidate(),
});
```

## Next.js Usage

Works seamlessly with Next.js App Router:

```typescript
// app/users/page.tsx
'use client';

import { QueryCacheManager } from '@your-scope/react-query-cache-manager';

export default function UsersPage() {
  const queryClient = useQueryClient();

  const cache = new QueryCacheManager({
    queryClient,
    queryKey: ['users'],
    getItems: (data) => data,
    setItems: (data, items) => items,
  });

  // ... rest of component
}
```

## Real-World Example

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryCacheManager } from '@your-scope/react-query-cache-manager';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

function TodoApp() {
  const queryClient = useQueryClient();

  // Setup cache manager
  const todoCache = new QueryCacheManager<Todo[], Todo>({
    queryClient,
    queryKey: ['todos'],
    getItems: (data) => data,
    setItems: (_, items) => items,
  });

  // Fetch todos
  const { data: todos } = useQuery({
    queryKey: ['todos'],
    queryFn: () => fetch('/api/todos').then(r => r.json()),
  });

  // Mutations with optimistic updates
  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onMutate: (title) => {
      // Optimistically add with temp ID
      todoCache.create({
        id: `temp-${Date.now()}`,
        title,
        completed: false,
      });
    },
    onError: () => todoCache.invalidate(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (todo: Todo) => {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...todo, completed: !todo.completed }),
      });
      return res.json();
    },
    onMutate: (todo) => {
      // Optimistically update
      todoCache.update({ id: todo.id, completed: !todo.completed });
    },
    onError: () => todoCache.invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/todos/${id}`, { method: 'DELETE' }),
    onMutate: (id) => {
      // Optimistically remove
      todoCache.delete(id);
    },
    onError: () => todoCache.invalidate(),
  });

  return (
    <div>
      <input
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            createMutation.mutate(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        placeholder="Add todo..."
      />
      <ul>
        {todos?.map((todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleMutation.mutate(todo)}
            />
            <span>{todo.title}</span>
            <button onClick={() => deleteMutation.mutate(todo.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Always handle errors** - Call `invalidate()` on mutation errors
2. **Use temporary IDs** - For creates, use `temp-${Date.now()}` or similar
3. **One manager per query** - Create separate instances for different queries
4. **Type everything** - Provide TypeScript types for full type safety

## Why This Package?

Other cache management solutions are often rigid and assume specific response formats. This package:

- Works with **any** API response structure
- Lets **you** define how to access your data
- Stays simple and focused
- Doesn't make assumptions about your backend

## License

MIT

## Contributing

Issues and PRs welcome!
