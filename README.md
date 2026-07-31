<div align="center">

# tanstack-cacher

**Update your TanStack Query cache instead of refetching it — one line, any response shape.**

[![npm version](https://img.shields.io/npm/v/tanstack-cacher.svg)](https://www.npmjs.com/package/tanstack-cacher)
[![npm downloads](https://img.shields.io/npm/dm/tanstack-cacher.svg)](https://www.npmjs.com/package/tanstack-cacher)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![peer: react-query v5](https://img.shields.io/badge/TanStack%20Query-v5-ff4154.svg)](https://tanstack.com/query/latest)

</div>

```ts
// user created → put it in the list instantly. No refetch, no spinner, no flicker.
usersCache.add(newUser);
```

You tell the library **where** your list lives inside the response (`data.content`, `items`, `result.users`, or the response itself) and it handles the rest: inserting, merging, deleting, and keeping pagination counters (`totalElements`, `totalPages`, `numberOfElements`) correct.

---

## Contents

| Section | What you'll find |
| --- | --- |
| [Why](#why) | The problem this removes from your codebase |
| [Installation](#installation) | Install + peer deps |
| [Quick start](#quick-start-3-steps) | Working code in 3 steps |
| [Core idea: paths](#core-idea-paths) | `itemsPath` and the pagination paths |
| [Configuration reference](#configuration-reference) | Every option, every default |
| [`QueryCacheManager`](#querycachemanager--the-cache-api) | The full cache API, method by method |
| [`useQueryCacheManagers`](#usequerycachemanagers--managers-inside-components) | Create managers in a component |
| [`useCacherMutation`](#usecachermutation--mutate--cache--notify) | Mutate + update cache + notify in one hook |
| [`CacheProvider` / `useCacherContext`](#cacheprovider--usecachercontext--global-notifications) | Global toast + error-message wiring |
| [**`usePaginatedCacheActions`**](#usepaginatedcacheactions--paginated-tables-done-right) | **Full paginated-table walkthrough** |
| [`cacheManagerFactory`](#cachemanagerfactory--plug-in-your-own-manager) | Your own manager class, globally |
| [Registry helpers](#registry-helpers) | `resetCacheManager`, `resetAllCacheManagers` |
| [Recipes](#recipes) | Common response shapes & patterns |
| [Gotchas & FAQ](#gotchas--faq) | Read this when something doesn't update |
| [API index](#api-index) | Everything the package exports |

---

## Why

Every feature that creates, edits or deletes a row ends up writing this by hand:

```ts
queryClient.setQueryData(['users', page, search], (old) => {
  if (!old) return old;
  const total = old.data.page.totalElements + 1;
  return {
    ...old,
    data: {
      ...old.data,
      content: [newUser, ...old.data.content].slice(0, old.data.page.size),
      page: {
        ...old.data.page,
        totalElements: total,
        totalPages: Math.ceil(total / old.data.page.size),
        numberOfElements: Math.min(old.data.page.size, total),
      },
    },
  };
});
```

With `tanstack-cacher`:

```ts
usersCache.add(newUser);
```

| | |
| --- | --- |
| **Any response shape** | Flat arrays, nested objects, Spring Boot pages, Laravel/JSON:API — just give a path |
| **Pagination aware** | `totalElements` / `totalPages` recalculated automatically on add & delete |
| **Table-smart** | A dedicated hook for paginated tables: page trimming, page fallback, auto-refill |
| **Type safe** | TypeScript-first, full generics for your response and item types |
| **No runtime deps** | Peer deps only: `react` + `@tanstack/react-query` v5 |
| **Fail safe** | If a cache write throws, the query is invalidated — your UI never shows a broken list |
| **Extensible** | Swap in your own manager class app-wide (logging, analytics, validation) |

---

## Installation

```bash
npm install tanstack-cacher
```

```bash
yarn add tanstack-cacher
```

```bash
pnpm add tanstack-cacher
```

Peer dependencies (you almost certainly have them already):

```bash
npm install @tanstack/react-query react
```

| Peer | Supported range |
| --- | --- |
| `@tanstack/react-query` | `^5.0.0` |
| `react` | `^16.8.0 \|\| ^17 \|\| ^18 \|\| ^19` |
| `node` | `>=16` (tooling only) |

ESM build, tree-shakeable, ships its own `.d.ts` — no `@types/*` package needed.

---

## Quick start (3 steps)

Assume your API returns a Spring-Boot-style page:

```json
{
  "data": {
    "content": [{ "id": 1, "name": "Ada" }],
    "page": { "totalElements": 42, "totalPages": 5, "number": 0, "size": 10 }
  }
}
```

### 1 — Describe the cache

```tsx
import { useQueryCacheManagers, type QueryCacheManager } from 'tanstack-cacher';

type User = { id: number; name: string };
type UsersResponse = {
  data: {
    content: User[];
    page: { totalElements: number; totalPages: number; number: number; size: number };
  };
};

const useUsersCache = () =>
  useQueryCacheManagers<{ users: QueryCacheManager<UsersResponse, User> }>({
    users: {
      queryKey: ['users'],
      options: {
        itemsPath: 'data.content', // where the array lives
        pagination: {},            // enable pagination handling (defaults below)
      },
    },
  });
```

### 2 — Write to it after a mutation

```tsx
const { users } = useUsersCache();

const { mutate: createUser } = useMutation({
  mutationFn: api.createUser,
  onSuccess: (created) => users.add(created), // ← instant, no refetch
});
```

### 3 — Done

The new row appears at the top, `totalElements` becomes `43`, `totalPages` is recalculated, and no network request was made.

Want mutation + cache + toast in a single hook? That's [`useCacherMutation`](#usecachermutation--mutate--cache--notify):

```tsx
const { mutate: createUser } = useCacherMutation({
  mutationFn: api.createUser,
  notify: true,
  cacheActions: {
    type: 'add',
    queryKey: ['users'],
    itemsPath: 'data.content',
    pagination: {},
  },
});
```

---

## Core idea: paths

No custom getter/setter functions to write. You point at your data with **dot-notation paths**.

### `itemsPath` — where the array is

| Your response | `itemsPath` |
| --- | --- |
| `[{ ... }, { ... }]` (the response **is** the array) | `''` (empty string) |
| `{ items: [...] }` | `'items'` |
| `{ data: [...] }` | `'data'` |
| `{ data: { content: [...] } }` | `'data.content'` *(manager default)* |
| `{ result: { users: [...] } }` | `'result.users'` |
| `{ payload: { list: { rows: [...] } } }` | `'payload.list.rows'` |

> `QueryCacheManager` defaults `itemsPath` to `'data.content'` when you omit it, while `useQueryCacheManagers` defaults it to `''` (the response itself is the array). Set it explicitly and you never have to remember this.

### Pagination paths

Passing a `pagination` object is what **turns pagination handling on**. Any path you leave out falls back to a default:

```ts
pagination: {
  totalElementsPath: 'data.page.totalElements', // default
  totalPagesPath:    'data.page.totalPages',    // default
  currentPagePath:   'data.page.number',        // default
  pageSizePath:      'data.page.size',          // default
  numberOfElementsPath: undefined,              // no default — set it if your API has it
}
```

So `pagination: {}` = "use all four defaults". Override only what differs:

```ts
pagination: {
  totalElementsPath: 'meta.total',
  totalPagesPath: 'meta.last_page',
  currentPagePath: 'meta.current_page',
  pageSizePath: 'meta.per_page',
}
```

**Leave `pagination` out entirely** and the data is treated as a plain list — no counters touched.

Who reads which path:

| Path | Used by |
| --- | --- |
| `totalElementsPath` | `add`, `delete`, `clear` + `usePaginatedCacheActions` |
| `totalPagesPath` | `add`, `delete`, `clear` + `usePaginatedCacheActions` |
| `pageSizePath` | recalculating `totalPages`; page trimming in `usePaginatedCacheActions` |
| `currentPagePath` | `usePaginatedCacheActions` only |
| `numberOfElementsPath` | `usePaginatedCacheActions` only |

---

## Configuration reference

### `CacheConfig<TData, TItem>`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `queryKey` | `QueryKey` | **required** | The TanStack Query key of the cache you're managing |
| `queryClient` | `QueryClient` | injected | Injected by the hooks; pass it yourself only outside React |
| `itemsPath` | `string` | `'data.content'` | Dot path to the items array. `''` = the data itself is the array |
| `pagination` | `PaginationConfig` | `undefined` | Presence of this object enables pagination handling |
| `keyExtractor` | `(item) => string \| number` | `(item) => item.id` | How an item is identified |
| `initialData` | `TData` | `undefined` | Structure to build from when the cache is empty |
| `isPaginated` | `boolean` | derived | Derived from `pagination`; readable via `getConfig()` |

Generics: **`TData` = your whole response type**, **`TItem` = one list item**.

```ts
new QueryCacheManager<UsersResponse, User>({ /* ... */ });
```

`CacheOptions` is the same type minus `queryClient` and `queryKey` — perfect for shared presets:

```ts
import type { CacheOptions } from 'tanstack-cacher';

export const PAGED_LIST: CacheOptions = { itemsPath: 'data.content', pagination: {} };
export const FLAT_LIST: CacheOptions = { itemsPath: 'data' };

// then
useQueryCacheManagers({ users: { queryKey: ['users'], options: PAGED_LIST } });
```

---

## `QueryCacheManager` — the cache API

The class doing the real work. Get one from [`useQueryCacheManagers`](#usequerycachemanagers--managers-inside-components) inside components, or construct it directly outside React (services, sagas, event handlers):

```ts
import { QueryCacheManager } from 'tanstack-cacher';

const users = new QueryCacheManager<UsersResponse, User>({
  queryClient,                 // your own QueryClient instance
  queryKey: ['users'],
  itemsPath: 'data.content',
  pagination: {},
});
```

### Methods at a glance

| Method | What it does |
| --- | --- |
| `add(item, position?)` | Insert an item (`'start'` \| `'end'`) and bump pagination counters |
| `update(partialItem, matcher?)` | Shallow-**merge** changes into the matching item |
| `delete(itemOrId, matcher?)` | Remove matching item(s) and decrease pagination counters |
| `updateArrayAtPath(path, updater, options?)` | Edit **any** array in the response, not just the main list |
| `updateWithCustomLogic(updater)` | Full manual control over the cached object |
| `replace(newData)` | Overwrite the whole cache entry |
| `clear()` | Empty the list and reset counters to `0` |
| `getItemsFromCache()` | Read the current items array |
| `getDataFromCache()` | Read the whole cached response |
| `invalidate()` | Mark stale → TanStack refetches |
| `refetch(key?)` | Refetch immediately |
| `hasQuery(key)` | Is that query in the cache? |
| `removeQuery(key)` | Drop that query from the cache |
| `getConfig()` | The resolved config (paths after defaults were applied) |
| `createHandlers()` | `{ onAdd, onUpdate, onDelete }` callbacks you can pass around |

---

### `add(item, position = 'start')`

```ts
users.add(newUser);        // prepend — newest first, the usual case
users.add(newUser, 'end'); // append
```

- Inserts into the array at `itemsPath`.
- With pagination configured: `totalElements + 1`, then `totalPages = ceil(totalElements / pageSize)`.
- If the cache is empty, the structure is built from `initialData` (or a minimal object).

> For **paginated tables**, prefer [`usePaginatedCacheActions`](#usepaginatedcacheactions--paginated-tables-done-right) — it also trims the page to `pageSize`, so a 10-row page never shows 11 rows.

### `update(partialItem, matcher?)`

```ts
// merge by keyExtractor (item.id by default) — include the id!
users.update({ id: 5, name: 'New name' });

// merge by custom matcher — every match is updated
users.update({ status: 'ACTIVE' }, (u) => u.departmentId === 3);
```

- **Shallow merge**: `{ ...existingItem, ...partialItem }` — fields you don't send survive.
- Pagination counters untouched (the count didn't change).

### `delete(itemOrId, matcher?)`

```ts
users.delete(5);                                // by id
users.delete(userObject);                       // by object (id via keyExtractor)
users.delete(0, (u) => u.status === 'DELETED'); // by matcher (first arg ignored)
```

- Removes **every** match, decreases `totalElements` by the number actually removed, then recalculates `totalPages`.

### `updateArrayAtPath(path, updater, options?)`

Responses often carry more than one array — permissions inside a role, comments inside a post, tags on a product. This edits any of them:

```ts
// 1) push one item (prepend by default)
roleCache.updateArrayAtPath('data.permissions', newPermission);
roleCache.updateArrayAtPath('data.permissions', newPermission, { position: 'end' });

// 2) replace the whole array
roleCache.updateArrayAtPath('data.permissions', nextPermissions);

// 3) transform it — the most powerful form
roleCache.updateArrayAtPath<Permission>('data.permissions', (items) =>
  items.filter((p) => p.id !== removedId),
);
```

- Nothing happens if the cache entry doesn't exist yet.
- If `updater` is falsy (`null` / `undefined`), the query is invalidated instead of writing garbage.
- A missing or non-array value at `path` is treated as `[]`.
- Pagination counters are **not** touched — this is a raw array edit.

### `updateWithCustomLogic(updater)`

The escape hatch: gets the cached object, returns the next one. Runs only when data exists.

```ts
notificationsCache.updateWithCustomLogic((old) => ({
  ...old,
  data: { ...old.data, unreadCount: old.data.unreadCount + 1 },
}));
```

### `replace(newData)` / `clear()`

```ts
users.replace(freshResponse); // overwrite everything
users.clear();                // empty the list; totalElements & totalPages → 0
```

### Reading the cache

```ts
const items = users.getItemsFromCache(); // User[] — empty array if nothing cached
const raw   = users.getDataFromCache();  // UsersResponse | undefined
const cfg   = users.getConfig();         // resolved paths, keyExtractor, queryClient…
```

### Invalidate & refetch

```ts
users.invalidate();                // mark stale → refetch per TanStack rules
users.refetch();                   // refetch this manager's queryKey (exact)
users.refetch('roles');            // refetch ['roles']
users.refetch(['roles', 'units']); // refetch ['roles'] and ['units'] separately
```

### Query existence & removal

```ts
users.hasQuery('users');    // boolean
users.removeQuery('users'); // drop it from the cache entirely
```

> **Pass the key explicitly.** Both wrap their argument as `[key]`, so they expect a single string segment — see [Gotchas](#gotchas--faq).

### `createHandlers()`

Turns a manager into three plain callbacks — handy for dumb components or your own mutation wrappers:

```tsx
const { onAdd, onUpdate, onDelete } = users.createHandlers();

<UserForm onCreated={onAdd} onEdited={onUpdate} onRemoved={onDelete} />
```

---

## `useQueryCacheManagers` — managers inside components

Declare every cache a screen touches in one call. The `queryClient` is injected for you.

```tsx
import { useQueryCacheManagers, type QueryCacheManager } from 'tanstack-cacher';

type Managers = {
  users: QueryCacheManager<UsersResponse, User>;
  roles: QueryCacheManager<RolesResponse, Role>;
  tags: QueryCacheManager<Tag[], Tag>;
};

const UsersPage = () => {
  const { users, roles, tags } = useQueryCacheManagers<Managers>({
    users: {
      queryKey: ['users', page, search], // same key as your useQuery!
      options: { itemsPath: 'data.content', pagination: {} },
    },
    roles: {
      queryKey: ['roles'],
      options: { itemsPath: 'data' },
    },
    tags: {
      queryKey: ['tags'], // itemsPath omitted → the response itself is the array
    },
  });

  // users.add(...) · roles.update(...) · tags.delete(...)
};
```

- The keys you pass are the keys you get back, fully typed.
- Put everything that identifies the cache in `queryKey` — filters, page, search — exactly like in `useQuery`.
- Managers are cheap stateless wrappers; recreating them each render is fine.

---

## `useCacherMutation` — mutate + cache + notify

A drop-in replacement for `useMutation` that can also update caches and fire notifications.

```tsx
import { useCacherMutation } from 'tanstack-cacher';

const useCreateUser = () =>
  useCacherMutation<User, ApiError, CreateUserDto>({
    mutationFn: (dto) => api.createUser(dto),

    // notifications
    notify: true,
    successMessage: 'User created',
    errorMessage: 'Could not create user',

    // cache updates
    cacheActions: {
      type: 'add',
      queryKey: ['users'],
      itemsPath: 'data.content',
      pagination: {},
    },
  });
```

```tsx
const { mutate, isPending } = useCreateUser();

<Button loading={isPending} onClick={() => mutate(formValues)}>Save</Button>
```

Accepts **every** `useMutation` option (`mutationFn`, `mutationKey`, `retry`, `onSettled`, …) plus:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `cacheActions` | `CacheAction \| CacheAction[]` | – | Cache operations to run on success |
| `notify` | `boolean` | `false` | Shortcut for success **and** error notifications |
| `notifySuccess` | `boolean` | `false` | Notify only on success |
| `notifyError` | `boolean` | `false` | Notify only on error |
| `successMessage` | `string` | `'Əməliyyat uğurla tamamlandı!'` | Success text |
| `errorMessage` | `string` | `'Əməliyyat zamanı xəta baş verdi!'` | Fallback error text |
| `notificationConfig` | `{ duration?: number; [k: string]: any }` | `{ duration: 2 }` | Passed straight to your notifier |

> The built-in default messages are Azerbaijani. Pass your own strings (or i18n `t(...)` values) in any app that isn't.

### `cacheActions`

A cache action is a [`CacheConfig`](#cacheconfigtdata-titem) (without `queryClient`) plus a `type`:

| `type` | Runs | Uses the mutation response as… |
| --- | --- | --- |
| `'add'` | `manager.add(data)` | the new item |
| `'update'` | `manager.update(data)` | the partial item (must contain the id) |
| `'remove'` | `manager.delete(data)` | the item to delete |
| `'invalidate'` | `manager.invalidate()` | ignored |

**Whatever your `mutationFn` resolves to is what gets written into the cache.** If your API replies `{ data: user }` instead of `user`, unwrap it in `mutationFn`:

```ts
mutationFn: (dto) => api.createUser(dto).then((res) => res.data),
```

Several actions in one mutation — update one list, invalidate the rest:

```tsx
useCacherMutation({
  mutationFn: api.deleteUser,
  notify: true,
  cacheActions: [
    { type: 'remove', queryKey: ['users'], itemsPath: 'data.content', pagination: {} },
    { type: 'invalidate', queryKey: ['users-stats'] },
    { type: 'invalidate', queryKey: ['audit-log'] },
  ],
});
```

### Execution order

- **Success:** success notification → your `onSuccess` → cache actions.
- **Error:** message resolved as `getErrorMessage(error)` → `error.error.message` → `errorMessage`, then the error notification → your `onError`.

Notifications are optional — without a [`CacheProvider`](#cacheprovider--usecachercontext--global-notifications) nothing is shown and nothing breaks (a console warning is logged).

---

## `CacheProvider` & `useCacherContext` — global notifications

Wire your toast library in **once**; every `useCacherMutation` in the tree uses it.

```tsx
import { CacheProvider } from 'tanstack-cacher';

const Providers = ({ children }) => {
  const { showSuccess, showError } = useMyToast(); // antd, sonner, react-toastify, yours…

  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider
        config={{
          showSuccess,
          showError,
          getErrorMessage: (error) => error?.response?.data?.message,
        }}
      >
        {children}
      </CacheProvider>
    </QueryClientProvider>
  );
};
```

| `config` field | Signature | Purpose |
| --- | --- | --- |
| `showSuccess` | `(message: string, options?: NotificationOptions) => void` | Success toast |
| `showError` | `(message: string, options?: NotificationOptions) => void` | Error toast |
| `getErrorMessage` | `(error: any) => string \| undefined` | Pull a human message out of an API error; return `undefined` to fall back to `errorMessage` |

`CacheProvider` must sit **inside** `QueryClientProvider` — it reads the query client and hands it to [`cacheManagerFactory`](#cachemanagerfactory--plug-in-your-own-manager).

As an HOC, if that fits your app better:

```tsx
const withTanstackCacher = (Component) => (props) => {
  const { showSuccess, showError } = useNotify();

  return (
    <CacheProvider
      config={{ showSuccess, showError, getErrorMessage: (e) => e?.message?.data }}
    >
      <Component {...props} />
    </CacheProvider>
  );
};
```

Need the notifiers directly in a component?

```tsx
import { useCacherContext } from 'tanstack-cacher';

const { showSuccess, showError, getErrorMessage } = useCacherContext();
showSuccess('Saved', { duration: 3 });
```

---

## `usePaginatedCacheActions` — paginated tables done right

`manager.add()` is enough for a simple list. A **paginated table** needs more, and every team re-implements the same four rules:

1. A 10-row page must stay 10 rows after an insert — not 11.
2. After creating a row the user should land on the first page, with filters cleared, so the new row is actually visible.
3. Deleting the last row of page 3 should send the user back to page 2 — not show an empty table.
4. When a page thins out (say 3 rows left of 10) it should quietly refill from the server.

This hook does all four.

### Full example

```tsx
import { useState } from 'react';
import {
  useQuery,
  useQueryCacheManagers,
  usePaginatedCacheActions,
  type QueryCacheManager,
} from 'tanstack-cacher';

type User = { id: number; name: string; email: string };

type UsersResponse = {
  data: {
    content: User[];
    page: {
      totalElements: number;
      totalPages: number;
      number: number; // current page — 0-based in this API
      size: number;
      numberOfElements: number;
    };
  };
};

const PAGE_SIZE = 10;

export const UsersTable = () => {
  // 1 ── table state
  const [page, setPage] = useState(0); // 0-based, same as the API
  const [search, setSearch] = useState('');

  // 2 ── the query
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => api.getUsers({ page, size: PAGE_SIZE, search }),
  });

  // 3 ── the cache manager for that exact query key
  const { users } = useQueryCacheManagers<{
    users: QueryCacheManager<UsersResponse, User>;
  }>({
    users: {
      queryKey: ['users', page, search],
      options: {
        itemsPath: 'data.content',
        pagination: {
          totalElementsPath: 'data.page.totalElements',
          totalPagesPath: 'data.page.totalPages',
          currentPagePath: 'data.page.number',
          pageSizePath: 'data.page.size',
          numberOfElementsPath: 'data.page.numberOfElements',
        },
      },
    },
  });

  // 4 ── the paginated actions
  const { add, update, remove } = usePaginatedCacheActions<UsersResponse, User>({
    cacher: users,
    defaultPage: 0,          // "first page" value in your cached data
    refetchThreshold: 5,     // refill the page when it drops to 5 rows or fewer
    onNavigateToPage: (p) => setPage(p),
    onClearSearch: () => setSearch(''),
    onRefetch: () => refetch(),
  });

  // 5 ── mutations feed the three actions
  const createUser = useMutation({
    mutationFn: api.createUser,
    onSuccess: (created) => add(created), // → page 0, search cleared, row on top
  });

  const editUser = useMutation({
    mutationFn: api.updateUser,
    onSuccess: (edited) => update(edited), // → replaced in place (send the FULL object)
  });

  const deleteUser = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: (_res, id) => remove(id), // → removed, counters fixed, page handled
  });

  // 6 ── render
  return (
    <Table
      loading={isFetching}
      dataSource={data?.data.content}
      pagination={{
        current: page + 1,                        // antd is 1-based
        pageSize: data?.data.page.size ?? PAGE_SIZE,
        total: data?.data.page.totalElements ?? 0,
        onChange: (p) => setPage(p - 1),
      }}
      onEdit={editUser.mutate}
      onDelete={deleteUser.mutate}
    />
  );
};
```

### Config

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `cacher` | `QueryCacheManager` | **required** | Supplies the query key and all the paths |
| `defaultPage` | `number` | `0` | Which value means "first page" in your cached data |
| `refetchThreshold` | `number` | `5` | Rows left after a delete that should trigger `onRefetch` |
| `onNavigateToPage` | `(page: number) => void` | – | Called when the table should change page |
| `onClearSearch` | `() => void` | – | Called before an insert so the new row is visible |
| `onRefetch` | `() => void` | – | Called when the page should be refilled from the server |

Items must have an `id` — `TItem extends { id: string | number }`. This hook matches by `id` and does **not** use `keyExtractor`.

Paths come from `cacher.getConfig().pagination`. If the manager has **no** `pagination` config, flat fallbacks are used: `page`, `size`, `totalElements`, `totalPages`, `numberOfElements`.

### What each action does, exactly

**`add(item)`** — after a create

```ts
add(createdUser);
```

1. Calls `onClearSearch()`, then `onNavigateToPage(1)`.
2. For every cached query matching the key: if the cached page is **not** `defaultPage`, that entry is left alone (its contents shift server-side anyway).
3. On the first page: the item is prepended, the array is **trimmed to `pageSize`**, then `totalElements + 1`, `totalPages = ceil(total / pageSize)`, `numberOfElements = rows now on the page`.

**`update(item)`** — after an edit

```ts
update(editedUser); // ⚠️ full object, not a partial
```

- Finds the row by `id` and **replaces it entirely** (this is a replace, not a merge — unlike `manager.update()`), keeping its position. Pages that don't contain the id are untouched. Counters unchanged.

**`remove(id)`** — after a delete

```ts
remove(userId);
```

1. Filters the row out, then recalculates `totalElements`, `totalPages`, `numberOfElements`.
2. If the page is now **empty** and the current page is past `defaultPage` → `onNavigateToPage(currentPage - 1)`.
3. Otherwise, if the rows left are `<= refetchThreshold` **and** further pages exist → `onRefetch()` is called (after the cache write) so the gap gets refilled.

### Two details worth knowing

> **It updates every cached page.** The hook writes with `setQueriesData`, so all cached queries whose key *starts with* the manager's `queryKey` are visited — every page and filter variant, not just the one on screen. That's why the "not the first page → skip" rule exists.

> **Page numbering.** `add` calls `onNavigateToPage(1)`, while the empty-page fallback passes `currentPage - 1` derived from the cached value at `currentPagePath`. If your page state is 0-based, normalize inside your callback:
> ```ts
> onNavigateToPage: (p) => setPage(Math.max(0, p - 1)),
> ```

### `manager` vs `usePaginatedCacheActions`

| | `QueryCacheManager` | `usePaginatedCacheActions` |
| --- | --- | --- |
| Query keys touched | one exact key | every key with that prefix |
| Trims page to `pageSize` | no | yes |
| Navigates / clears search | no | yes |
| Auto-refill on thin page | no | yes |
| `update` semantics | merge partial | replace whole item |
| Matching | `keyExtractor` | `item.id` |
| Best for | simple lists, nested arrays, custom writes | server-paginated tables |

---

## `cacheManagerFactory` — plug in your own manager

`useCacherMutation` builds its managers through a factory. Point that factory at your own subclass once and every mutation in the app uses it — great for logging, analytics, validation or error reporting.

```ts
import { QueryCacheManager, type InsertPosition } from 'tanstack-cacher';

export class LoggingManager<TData, TItem> extends QueryCacheManager<TData, TItem> {
  override add(item: TItem, position: InsertPosition = 'start') {
    analytics.track('cache_add', { item });
    super.add(item, position);
  }

  override update(item: Partial<TItem>, matcher?: (i: TItem) => boolean) {
    logger.debug('cache_update', item);
    super.update(item, matcher);
  }

  override delete(itemOrId: TItem | string | number, matcher?: (i: TItem) => boolean) {
    analytics.track('cache_delete', { itemOrId });
    super.delete(itemOrId, matcher);
  }
}
```

Register it at app startup, before any mutation runs:

```ts
import { cacheManagerFactory } from 'tanstack-cacher';
import { LoggingManager } from './cache/LoggingManager';

cacheManagerFactory.setManagerClass(LoggingManager);
```

### Factory API

| Method | Description |
| --- | --- |
| `setManagerClass(Class)` | Use `Class` for every manager the library creates |
| `getManagerClass()` | The class currently in use |
| `resetManagerClass()` | Back to the built-in `QueryCacheManager` |
| `setQueryClient(client)` | Store a query client (done for you by `CacheProvider`) |
| `getQueryClient()` | The stored client, or `null` |
| `create(config)` | Build a manager instance with the configured class |

Validation example:

```ts
export class ValidatingManager<TData, TItem> extends QueryCacheManager<TData, TItem> {
  override add(item: TItem, position: InsertPosition = 'start') {
    if (item == null) throw new Error('Refusing to cache an empty item');
    super.add(item, position);
  }
}
```

---

## Registry helpers

```ts
import { resetCacheManager, resetAllCacheManagers } from 'tanstack-cacher';

resetCacheManager(['users']); // forget the cached manager instance for this key
resetAllCacheManagers();      // forget all of them
```

These clear the library's internal manager-instance registry. Since the hooks build managers per render, most apps never need them — they exist for teardown scenarios such as test suites or a full logout reset.

---

## Recipes

### A flat array response

```json
[{ "id": 1, "name": "Ada" }]
```

```ts
const { tags } = useQueryCacheManagers<{ tags: QueryCacheManager<Tag[], Tag> }>({
  tags: { queryKey: ['tags'], options: { itemsPath: '' } },
});

tags.add({ id: 9, name: 'new' });
```

### Identifiers that aren't `id`

```ts
options: {
  itemsPath: 'data.content',
  keyExtractor: (user) => user.uuid,
}
```

### Laravel / JSON:API style pagination

```json
{ "data": [], "meta": { "total": 42, "last_page": 5, "current_page": 1, "per_page": 10 } }
```

```ts
options: {
  itemsPath: 'data',
  pagination: {
    totalElementsPath: 'meta.total',
    totalPagesPath: 'meta.last_page',
    currentPagePath: 'meta.current_page',
    pageSizePath: 'meta.per_page',
  },
}
```

Note the API is 1-based here, so pass `defaultPage: 1` to `usePaginatedCacheActions`.

### Writing into an empty cache

```ts
options: {
  itemsPath: 'data.content',
  pagination: {},
  initialData: {
    data: { content: [], page: { totalElements: 0, totalPages: 0, number: 0, size: 10 } },
  },
}
```

### Truly optimistic update with rollback

The library writes on success; for a pre-request paint keep TanStack's own pattern and use the manager for both writes:

```ts
useCacherMutation({
  mutationFn: api.renameUser,
  onMutate: (vars) => {
    const previous = users.getDataFromCache();
    users.update({ id: vars.id, name: vars.name }); // paint immediately
    return { previous };
  },
  onError: (_error, _vars, ctx) => {
    if (ctx?.previous) users.replace(ctx.previous); // roll back
  },
});
```

### Nested arrays inside one entity

```ts
// add a comment to a cached post
postCache.updateArrayAtPath<Comment>('data.comments', (comments) => [...comments, newComment]);

// toggle a permission on a cached role
roleCache.updateArrayAtPath<Permission>('data.permissions', (ps) =>
  ps.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
);
```

### Reusable feature hook

```ts
// features/users/useUsersCache.ts
export const useUsersCache = (page: number, search: string) => {
  const { users } = useQueryCacheManagers<{ users: QueryCacheManager<UsersResponse, User> }>({
    users: {
      queryKey: ['users', page, search],
      options: { itemsPath: 'data.content', pagination: {} },
    },
  });

  return users;
};
```

### One import for everything

`tanstack-cacher` re-exports all of `@tanstack/react-query`:

```ts
import { useQuery, useQueryClient, QueryClientProvider, useCacherMutation } from 'tanstack-cacher';
```

`@tanstack/react-query` stays a peer dependency, so there's still only one installed copy — no duplicate-instance risk.

---

## Gotchas & FAQ

**Nothing happens when I call `add`.**
The `queryKey` must match the one your `useQuery` uses — including filters, page and search. `manager.add()` writes with `setQueryData` (exact key), so `['users', page, search]` in the query means the same array in the manager. (`usePaginatedCacheActions` is the prefix-matching alternative.)

**My pagination numbers don't move.**
Pagination handling is active only when a `pagination` object is present. Pass `pagination: {}` for the defaults, and verify your paths against a real response.

**`update` didn't change the row.**
Default matching uses `keyExtractor` (`item.id`), so the partial you pass must contain the id — or supply a `matcher`. Remember: `manager.update()` **merges**, `usePaginatedCacheActions().update()` **replaces**.

**`hasQuery()` / `removeQuery()` with no argument.**
Both wrap their argument as `[key]`, so call them with a single string segment (`users.hasQuery('users')`). With no argument on an array `queryKey` the key ends up nested one level too deep and won't match — use `invalidate()`, `refetch()`, or `queryClient.removeQueries()` for multi-segment keys.

**Why is my toast in Azerbaijani?**
Those are the built-in fallbacks for `successMessage` / `errorMessage`. Pass your own strings or i18n values to `useCacherMutation`.

**Do I need `CacheProvider`?**
Only for notifications. Cache updates work without it; `useCacherContext` logs a warning and notifications are skipped.

**Can a failed write corrupt my cache?**
`add`, `update`, `delete`, `replace`, `clear` and `updateArrayAtPath` all run inside `try/catch`. Errors are logged with a `[QueryCacheManager]` prefix and the query is invalidated, so the next render gets fresh server data.

**Are updates immutable?**
Yes. Paths are cloned level by level, so React Query's reference checks and re-renders behave normally.

**Does it work with `useInfiniteQuery`?**
The manager targets a single cache entry (`{ pages, pageParams }` for infinite queries), so use `updateWithCustomLogic` for those:

```ts
feedCache.updateWithCustomLogic((old) => ({
  ...old,
  pages: old.pages.map((p, i) => (i === 0 ? { ...p, items: [newItem, ...p.items] } : p)),
}));
```

**Does it work outside React (Next.js server code, services)?**
`QueryCacheManager` is a plain class — pass your own `queryClient` and use it anywhere. The hooks are React-only, as usual.

---

## API index

```ts
import {
  // hooks
  useCacherMutation,
  useCacherContext,
  useQueryCacheManagers,
  usePaginatedCacheActions,

  // core
  QueryCacheManager,
  cacheManagerFactory,

  // provider
  CacheProvider,

  // registry helpers
  resetCacheManager,
  resetAllCacheManagers,
} from 'tanstack-cacher';

import type {
  CacheConfig,
  CacheOptions,
  CacheHandlers,
  PaginationConfig,
  InsertPosition,
  CustomMutationOptions,
  CacheManagerConstructor,
  UsePaginatedCacheActionsConfig,
} from 'tanstack-cacher';
```

| Export | Kind | Docs |
| --- | --- | --- |
| `QueryCacheManager` | class | [API](#querycachemanager--the-cache-api) |
| `useQueryCacheManagers` | hook | [link](#usequerycachemanagers--managers-inside-components) |
| `useCacherMutation` | hook | [link](#usecachermutation--mutate--cache--notify) |
| `usePaginatedCacheActions` | hook | [link](#usepaginatedcacheactions--paginated-tables-done-right) |
| `useCacherContext` | hook | [link](#cacheprovider--usecachercontext--global-notifications) |
| `CacheProvider` | component | [link](#cacheprovider--usecachercontext--global-notifications) |
| `cacheManagerFactory` | singleton | [link](#cachemanagerfactory--plug-in-your-own-manager) |
| `resetCacheManager`, `resetAllCacheManagers` | functions | [link](#registry-helpers) |
| everything from `@tanstack/react-query` | re-export | [link](#one-import-for-everything) |

---

## Contributing

```bash
yarn install
yarn dev          # tsup in watch mode
yarn type-check   # tsc --noEmit
yarn lint         # eslint src
yarn build        # bundle + copy to package root
```

Issues and pull requests are welcome at [github.com/hacagahasanli/tanstack-cacher](https://github.com/hacagahasanli/tanstack-cacher).

## License

[MIT](./LICENSE) © [Hasanli Hacaga](https://github.com/hacagahasanli)
