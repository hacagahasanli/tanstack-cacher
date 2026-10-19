export type MutationTypes = 'add' | 'invalidate' | 'remove' | 'update';

export type ProgressInput = number | { loaded: number; total?: number };

export type ProgressHandler = (progress: ProgressInput) => void;
