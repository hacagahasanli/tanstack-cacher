[![npm version](https://img.shields.io/npm/v/tanstack-cacher.svg)](https://www.npmjs.com/package/tanstack-cacher)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Introduction

A robust, simplified TypeScript-first cache manager for React Query that works with **ANY response structure**. Using simple path-based configuration, it handles simple arrays, deeply nested data, paginated responses, and any custom format you throw at it.

## `useCacherMutation`

A drop-in replacement for `useMutation` that adds cache actions, notifications and progress tracking.

### Setup (React / Next.js App Router)

One provider is enough — pass `queryClient` and `CacheProvider` renders `QueryClientProvider` for you.
In Next.js put it in a client component (`'use client'`) and use it from `app/layout.tsx`.

```tsx
'use client';

import { useState } from 'react';
import { QueryClient, CacheProvider } from 'tanstack-cacher';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <CacheProvider
      queryClient={queryClient}
      config={{ showSuccess, showError, getErrorMessage }} // optional
    >
      {children}
    </CacheProvider>
  );
}
```

An existing `<QueryClientProvider>` also works — just put `CacheProvider` anywhere inside it (`config` is optional).
You can also pass a client explicitly: `useCacherMutation(options, queryClient)`.

### Usage

```tsx
const createTodo = useCacherMutation({
  mutationFn: (todo: NewTodo) => api.createTodo(todo),
  cacheActions: { type: 'add', queryKey: ['todos'], itemsPath: 'data' },
  isNotify: true,
});

const deleteTodo = useCacherMutation({
  mutationFn: (id: number) => api.deleteTodo(id),
  // DELETE usually returns nothing — take the id from variables
  cacheActions: { type: 'remove', queryKey: ['todos'], itemsPath: 'data', getItem: (_data, id) => id },
});
```

### Upload / download progress

Pass `isWithProgressTrack: true` and `mutationFn` receives `onProgress` in its second argument. It accepts a number (0–100) or any
progress event with `loaded` / `total` (axios `onUploadProgress` / `onDownloadProgress`, XHR `ProgressEvent`).
The hook then also returns `progress` (0–100), which resets on every new call and on `reset()`.
Without `isWithProgressTrack` the hook returns the plain `useMutation` result.

```tsx
const upload = useCacherMutation({
  isWithProgressTrack: true,
  mutationFn: (file: File, { onProgress }) => {
    const form = new FormData();
    form.append('file', file);
    return axios.post('/files', form, { onUploadProgress: onProgress }).then((r) => r.data);
  },
});

upload.mutate(file);

<progress value={upload.progress} max={100} />;
```

With [servios](https://www.npmjs.com/package/servios), pass it to the request's `onProgress`:

```tsx
const upload = useCacherMutation({
  isWithProgressTrack: true,
  mutationFn: (file: File, { onProgress }) => FilesService.upload(file, onProgress),
});

// FilesService
upload(file: File, onProgress?: (percent: number) => void) {
  return this.post({ endpoint: '/files', data: toFormData(file), onProgress });
}
```
