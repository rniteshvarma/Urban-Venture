/**
 * Provider-agnostic contract (News module spec, Part 2). No provider-specific
 * code lives outside /lib/news/providers/.
 *
 * RawArticle deliberately has NO body and NO imageUrl — adapters must never
 * populate them (spec Part 0 constraints 1 & 2). Whatever a live provider
 * returns for body/content/image is discarded in its mapToRawArticle().
 */

import type { NewsCity } from '@prisma/client';

export interface RawArticle {
  headline: string;
  sourceName: string;
  sourceDomain?: string;
  canonicalUrl: string;
  publishedAt: Date;
  blurb?: string; // short provider description (AI input only, never displayed)
  // NOTE: deliberately NO body, NO content, NO imageUrl. See spec Part 0.
}

export interface NewsProvider {
  readonly name: string;
  fetchForCity(city: NewsCity, sinceDate: Date): Promise<RawArticle[]>;
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}
