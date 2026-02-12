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
      map((response) => response.data)
    );
  }

  getPreferredMediaUrl(media?: Media | null): string | null {
    const url = media?.formats?.small?.url || media?.formats?.thumbnail?.url || media?.url;
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${this.apiBaseUrl}${url}`;
  }
}
