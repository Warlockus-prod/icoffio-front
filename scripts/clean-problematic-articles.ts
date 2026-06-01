/**
 * TypeScript shim for the PostgreSQL cleaner.
 * The runtime implementation lives in ./clean-problematic-articles.js
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const impl = require('./clean-problematic-articles.js');

export const cleanProblematicArticles: () => Promise<void> = impl.cleanProblematicArticles;
export const findProblematicArticles: () => Promise<unknown[]> = impl.findProblematicArticles;
