import '@testing-library/jest-dom';

// Stub IndexedDB for tests (Dexie uses fake-indexeddb in vitest with jsdom)
import 'fake-indexeddb/auto';
