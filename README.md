# React Query Cache Manager

[![npm version](https://img.shields.io/npm/v/tanstack-cacher.svg)](https://www.npmjs.com/package/tanstack-cacher)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Introduction

A robust, TypeScript-first cache manager for React Query that works with **ANY response structure**. Using simple path-based configuration, it handles simple arrays, deeply nested data, paginated responses, and any custom format you throw at it.

**Key Features:**
- Path-based configuration (e.g., `itemsPath: "data.content"`)
- Automatic handling of missing data and nested structures
- Built-in pagination metadata management
- Works with any response shape
- Full TypeScript support with type inference
- Zero dependencies (except React Query)

## Installation

```bash
npm install @your-scope/tanstack-cacher
# or
yarn add @your-scope/tanstack-cacher
# or
pnpm add @your-scope/tanstack-cacher
```

## Quick Start

### 1. Simple Array Response

```typescript
import { QueryCacheManager } from '@your-scope/tanstack-cacher';
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
    itemsPath: '', // Empty string = data IS the array
  });

  const createMutation = useMutation({
    mutationFn: createTodo,
    onMutate: (newTodo) => cache.add(newTodo),
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
  itemsPath: 'data.items', // Path to the array
});
```

### 3. Paginated Response (Automatic Metadata Updates!)

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
  itemsPath: 'content', // Path to items
  pagination: {
    totalElementsPath: 'page.totalElements', // Auto-updates on add/delete
    totalPagesPath: 'page.totalPages', // Auto-recalculated on add/delete
    currentPagePath: 'page.number',
    pageSizePath: 'page.size', // Required for totalPages calculation
  },
});

// Now when you add/delete, totalElements AND totalPages update automatically!
cache.add(newUser); // totalElements++, totalPages recalculated
cache.delete(userId); // totalElements--, totalPages recalculated
```

### 4. Different Pagination Format

```typescript
interface Response {
  items: Product[];
  meta: {
    total: number;
    currentPage: number;
    totalPages: number;
  };
}

const cache = new QueryCacheManager<Response, Product>({
  queryClient,
  queryKey: ['products'],
  itemsPath: 'items',
  pagination: {
    totalElementsPath: 'meta.total',
    totalPagesPath: 'meta.totalPages',
    currentPagePath: 'meta.currentPage',
    pageSizePath: 'meta.pageSize', // For auto totalPages calculation
  },
});
```

### 5. Deeply Nested Response

```typescript
interface ComplexResponse {
  status: 'ok';
  result: {
    data: {
      users: User[];
    };
    metadata: {
      count: number;
    };
  };
}

const cache = new QueryCacheManager<ComplexResponse, User>({
  queryClient,
  queryKey: ['users'],
  itemsPath: 'result.data.users', // Navigate with dots
  pagination: {
    totalElementsPath: 'result.metadata.count',
  },
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
| `itemsPath` | `string` | Yes | Dot-separated path to items array (empty string if data IS array) |
| `pagination` | `PaginationConfig` | No | Pagination metadata paths |
| `keyExtractor` | `(item: TItem) => string \| number` | No | Extract unique ID (default: `item.id`) |
| `initialData` | `TData` | No | Initial structure when cache is empty |

**PaginationConfig:**

| Option | Type | Description |
|--------|------|-------------|
| `totalElementsPath` | `string` | Path to total count (auto-updated on add/delete) |
| `totalPagesPath` | `string` | Path to total pages (auto-recalculated when pageSizePath provided) |
| `currentPagePath` | `string` | Path to current page number |
| `pageSizePath` | `string` | Path to page size (required for automatic totalPages recalculation) |

### Methods

#### `add(newItem, position?)`
Add new item to cache
```typescript
cache.add({ id: '1', name: 'John' }); // Adds at start (default)
cache.add({ id: '2', name: 'Jane' }, 'end'); // Adds at end
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

#### `clear()`
Clear all items (resets array to empty, updates pagination to 0)
```typescript
cache.clear();
```

#### `getItemsFromCache()`
Get current items array
```typescript
const items = cache.getItemsFromCache(); // returns TItem[]
```

#### `getDataFromCache()`
Get full cache data
```typescript
const fullData = cache.getDataFromCache(); // returns TData | undefined
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
  onMutate: handlers.onAdd,
  onError: () => cache.invalidate(),
});
```

## Real-World Example

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryCacheManager } from '@your-scope/tanstack-cacher';

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
    itemsPath: '', // Data IS the array
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
      todoCache.add({
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

## Next.js Usage

Works seamlessly with Next.js App Router:

```typescript
// app/users/page.tsx
'use client';

import { QueryCacheManager } from '@your-scope/tanstack-cacher';

export default function UsersPage() {
  const queryClient = useQueryClient();

  const cache = new QueryCacheManager({
    queryClient,
    queryKey: ['users'],
    itemsPath: 'data.users',
  });

  // ... rest of component
}
```

## Advanced Examples

### Handling Missing Data

The manager automatically creates the structure if data is missing:

```typescript
const cache = new QueryCacheManager<ApiResponse, User>({
  queryClient,
  queryKey: ['users'],
  itemsPath: 'data.content',
  // If cache is empty, this structure is created:
  initialData: {
    data: {
      content: [],
    },
    page: {
      totalElements: 0,
      totalPages: 0,
    },
  },
});

// Even if cache is empty, this works fine!
cache.add(newUser); // Creates structure + adds item
```

### Custom Key Extractor

```typescript
interface User {
  userId: string; // Not "id"
  name: string;
}

const cache = new QueryCacheManager<User[], User>({
  queryClient,
  queryKey: ['users'],
  itemsPath: '',
  keyExtractor: (user) => user.userId, // Custom ID field
});
```

### Multiple Cache Managers

```typescript
function App() {
  const queryClient = useQueryClient();

  // One manager per query
  const usersCache = new QueryCacheManager({
    queryClient,
    queryKey: ['users'],
    itemsPath: 'data.users',
  });

  const postsCache = new QueryCacheManager({
    queryClient,
    queryKey: ['posts'],
    itemsPath: 'posts',
  });

  // Use independently
  usersCache.add(newUser);
  postsCache.add(newPost);
}
```

## Best Practices

1. **Always handle errors** - Call `invalidate()` on mutation errors to refetch from server
2. **Use temporary IDs** - For optimistic creates, use `temp-${Date.now()}` or similar
3. **One manager per query** - Create separate instances for different queries
4. **Specify paths clearly** - Use dot notation for nested paths: `"data.result.items"`
5. **Type everything** - Provide TypeScript types for full type safety

## Why This Package?

Traditional cache managers assume your API structure. This package:

- **Works with ANY structure** - Just tell it the path to your data
- **Handles edge cases** - Missing data, nested objects, pagination metadata
- **Zero configuration overhead** - No complex setup or boilerplate
- **Type-safe** - Full TypeScript support with inference
- **Framework agnostic** - Works anywhere React Query works

## Migration from Old API

If you were using the old `getItems`/`setItems` approach:

```typescript
// Old way ❌
const cache = new QueryCacheManager({
  getItems: (data) => data.content,
  setItems: (data, items) => ({ ...data, content: items }),
  onItemsAdd: (data, count) => ({
    ...data,
    page: { ...data.page, totalElements: data.page.totalElements + count }
  }),
});

// New way ✅
const cache = new QueryCacheManager({
  itemsPath: 'content',
  pagination: {
    totalElementsPath: 'page.totalElements',
  },
});
```

Much simpler and safer!

## License

MIT

## Contributing

Issues and PRs welcome!
