/**
 * Provider registry (News module spec, Part 2).
 * Default is `live` — the keyless multi-source RSS provider. `mock` must now be
 * chosen explicitly (NEWS_PROVIDER=mock) so sample data can never ship by accident.
 */

import type { NewsProvider } from './types';
import { MockProvider } from './mock';
import { NewsDataProvider } from './newsdata';
import { MediastackProvider } from './mediastack';
import { LiveFeedsProvider } from './live';

export function getProvider(): NewsProvider {
  switch (process.env.NEWS_PROVIDER ?? 'live') {
    case 'live':
      return new LiveFeedsProvider();
    case 'newsdata':
      return new NewsDataProvider();
    case 'mediastack':
      return new MediastackProvider();
    case 'mock':
      return new MockProvider();
    default:
      return new LiveFeedsProvider();
  }
}

export function isMockMode(): boolean {
  return process.env.NEWS_PROVIDER === 'mock';
}

export type { NewsProvider, RawArticle } from './types';
