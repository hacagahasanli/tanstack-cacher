# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-10-19

### Added
- `useCacherMutation`: upload / download progress tracking — `isWithProgressTrack: true` passes `onProgress` to `mutationFn` (number 0–100 or any `{ loaded, total }` event, e.g. axios `onUploadProgress`) and returns `progress` (0–100)
- `useCacherMutation`: optional second argument `queryClient`
- `useResolvedQueryClient` hook — resolves the client from the argument → `QueryClientProvider` → `CacheProvider`
- `cacheActions[].getItem(data, variables)` — choose what gets written to the cache (e.g. the id from variables for `DELETE` endpoints)
- `CacheProvider`: optional `queryClient` prop — renders `QueryClientProvider` itself, so one provider is enough (React / Next.js App Router)
- Separate ESM (`index.mjs`) and CJS (`index.js`) builds with per-condition types (`index.d.mts` / `index.d.ts`)
- New type exports: `CacheActions`, `CacherMutationHook`, `CacherMutationResult`, `CacherMutationFnContext`, `ProgressInput`, `ProgressHandler`

### Changed
- **Breaking:** notification options renamed — `notify` → `isNotify`, `notifySuccess` → `isNotifySuccess`, `notifyError` → `isNotifyError`
- Default `notificationConfig.duration` is now `1.5` (was `2`)
- On success, cache actions now run **before** your `onSuccess`, and `onSuccess`'s return value is passed through
- `CacheProvider`: `config` is optional
- Shared types moved into `src/types`
- README: `useCacherMutation` progress, `getItem`, provider setup and API index updated

## [1.6.4] - 2026-07-31

### Documentation
- Complete README rewrite: every export documented with usage examples
- Full `usePaginatedCacheActions` walkthrough (table state, mutations, exact behaviour of `add` / `update` / `remove`)
- Path configuration reference (`itemsPath`, all pagination paths, defaults per entry point)
- `QueryCacheManager` method-by-method API, including `updateArrayAtPath` and `updateWithCustomLogic`
- Recipes for flat arrays, Spring Boot / Laravel style responses, empty caches, optimistic rollback and nested arrays
- Gotchas & FAQ section covering query-key matching, merge vs replace semantics and `hasQuery` / `removeQuery` key handling

### Changed
- Extra npm keywords for discoverability

## [1.6.x] - 2026
- `usePaginatedCacheActions` hook for server-paginated tables: page trimming, page fallback on empty page, threshold-based refetch

## [1.5.x] - 2026
- `QueryCacheManager.updateArrayAtPath` for editing any nested array in the cached response
- `useCustomMutation` renamed to `useCacherMutation`

## [1.3.1] - 2025-12-15
- Creating Factory Class for using exact configed CacheManager on hooks

## [1.0.0] - 2025-12-15

### Added
- Initial release of React Query Cache Manager
- **Flexible response format support** - Works with any API response structure
- User-defined `getItems` and `setItems` functions for maximum flexibility
- Optional metadata update callbacks (`onItemsAdd`, `onItemsRemove`)
- Full TypeScript support with generic types
- Optimistic cache operations: create, update, delete, replace
- Custom key extractors for item identification
- Custom matcher functions for filtering
- Handler pattern for mutation callbacks
- Tiny bundle size (~3.5KB)
- Tree-shakeable ESM and CJS builds
- Complete documentation with multiple examples
