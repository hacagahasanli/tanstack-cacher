# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
