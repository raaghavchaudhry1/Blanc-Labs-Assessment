import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, timeout } from 'rxjs';

export interface MediaFormat {
  url: string;
  width?: number;
  height?: number;
}

export interface Media {
  url: string;
  alternativeText?: string | null;
  width?: number;
  height?: number;
  formats?: {
    small?: MediaFormat;
    thumbnail?: MediaFormat;
  };
}

export interface NewsRelease {
  id: number;
  title: string;
  publishDate: string;
  externalUrl?: string | null;
  sortOrder?: number | null;
  createdAt: string;
  logo?: Media | null;
}

export interface NewsReleasePage {
  pageTitle: string;
  intro?: string | null;
  showLogos: boolean;
  ctaLabel: string;
  ctaStyle: 'primary' | 'secondary' | string;
  sortMode: 'publishDate_desc' | 'publishDate_asc' | 'manual_sortOrder_asc' | string;
  itemsPerPage: number;
  defaultLogo?: Media | null;
  news_releases: NewsRelease[];
}

interface StrapiResponse<T> {
  data: T;
  meta: unknown;
}

@Injectable({ providedIn: 'root' })
export class NewsReleaseService {
  private readonly apiBaseUrl = 'http://localhost:1337';
  private readonly pageEndpoint = '/api/news-release-page';

  constructor(private http: HttpClient) {}

  getNewsReleasePage(): Observable<NewsReleasePage> {
    const url = `${this.apiBaseUrl}${this.pageEndpoint}?populate[news_releases][populate]=logo&populate=defaultLogo`;
    return this.http.get<StrapiResponse<NewsReleasePage>>(url).pipe(
      timeout(8000),
      map((response) => this.normalizePage(response.data))
    );
  }

  getPreferredMediaUrl(media?: Media | null): string | null {
    const url = media?.formats?.small?.url || media?.formats?.thumbnail?.url || media?.url;
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${this.apiBaseUrl}${url}`;
  }

  private normalizePage(raw: unknown): NewsReleasePage {
    const page = this.unwrapEntity(raw) as Partial<NewsReleasePage>;
    const releasesRaw = this.unwrapRelationArray(page?.news_releases);
    const releases = releasesRaw
      .map((entry) => this.unwrapEntity(entry))
      .map((entry) => this.normalizeRelease(entry))
      .filter((entry): entry is NewsRelease => Boolean(entry));

    return {
      pageTitle: page?.pageTitle ?? 'News Releases',
      intro: page?.intro ?? null,
      showLogos: page?.showLogos ?? true,
      ctaLabel: page?.ctaLabel ?? 'Read More',
      ctaStyle: page?.ctaStyle ?? 'primary',
      sortMode: page?.sortMode ?? 'publishDate_desc',
      itemsPerPage: (page?.itemsPerPage ?? releases.length) || 1,
      defaultLogo: this.normalizeMedia((page as any)?.defaultLogo),
      news_releases: releases
    };
  }

  private normalizeRelease(raw: unknown): NewsRelease | null {
    const entry = this.unwrapEntity(raw) as Partial<NewsRelease> | null;
    if (!entry) return null;
    return {
      id: entry.id ?? 0,
      title: entry.title ?? 'Untitled',
      publishDate: entry.publishDate ?? new Date().toISOString(),
      externalUrl: entry.externalUrl ?? null,
      sortOrder: entry.sortOrder ?? null,
      createdAt: entry.createdAt ?? new Date().toISOString(),
      logo: this.normalizeMedia((entry as any)?.logo)
    };
  }

  private normalizeMedia(raw: unknown): Media | null {
    if (!raw) return null;
    const mediaEntity = (raw as any)?.data ? (raw as any).data : raw;
    const media = this.unwrapEntity(mediaEntity) as Media | null;
    if (!media || !media.url) return null;
    return media;
  }

  private unwrapEntity(raw: unknown): unknown | null {
    if (!raw) return null;
    const entity = raw as any;
    if (entity?.attributes) {
      return { id: entity.id, ...entity.attributes };
    }
    return entity;
  }

  private unwrapRelationArray(raw: unknown): unknown[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const relation = raw as any;
    if (Array.isArray(relation?.data)) return relation.data;
    return [];
  }
}
