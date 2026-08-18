/**
 * Provider registry (News module spec, Part 2). Going live is a one-line env
 * change: set NEWS_PROVIDER and the key — no other code changes.
 */

import type { NewsProvider } from './types';
import { MockProvider } from './mock';
import { NewsDataProvider } from './newsdata';
import { MediastackProvider } from './mediastack';

export function getProvider(): NewsProvider {
  switch (process.env.NEWS_PROVIDER ?? 'mock') {
    case 'newsdata':
      return new NewsDataProvider();
    case 'mediastack':
      return new MediastackProvider();
    case 'mock':
    default:
      return new MockProvider();
  }
}

export function isMockMode(): boolean {
  return (process.env.NEWS_PROVIDER ?? 'mock') === 'mock';
}

export type { NewsProvider, RawArticle } from './types';
