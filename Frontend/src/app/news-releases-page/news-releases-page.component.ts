import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { NewsRelease, NewsReleasePage, NewsReleaseService } from './news-release.service';

interface NewsReleaseView extends NewsRelease {
  logoUrl?: string | null;
}

@Component({
  selector: 'app-news-releases-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './news-releases-page.component.html',
  styleUrl: './news-releases-page.component.css'
})
export class NewsReleasesPageComponent implements OnInit {
  page = signal<NewsReleasePage | null>(null);
  visibleItems = signal<NewsReleaseView[]>([]);
  private sortedItems: NewsReleaseView[] = [];
  currentPage = signal(1);
  totalPages = signal(1);
  loading = signal(true);
  error = signal<string | null>(null);
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  constructor(private service: NewsReleaseService) {}

  ngOnInit(): void {
    this.fetchPage();
  }

  fetchPage(): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.getNewsReleasePage().subscribe({
      next: (page) => {
        this.page.set(page);
        this.sortedItems = this.prepareItems(page);
        this.setPage(1);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load news releases', err);
        this.error.set(
          'Unable to load news releases. Check that Strapi is running at http://localhost:1337 and that the endpoint is reachable.'
        );
        this.loading.set(false);
      }
    });
  }

  setPage(pageNumber: number): void {
    const page = this.page();
    if (!page) return;
    const perPage = Math.max(1, page.itemsPerPage || 1);
    const totalPages = Math.max(1, Math.ceil(this.sortedItems.length / perPage));
    this.totalPages.set(totalPages);
    const clamped = Math.min(Math.max(pageNumber, 1), totalPages);
    this.currentPage.set(clamped);
    const start = (clamped - 1) * perPage;
    this.visibleItems.set(this.sortedItems.slice(start, start + perPage));
  }

  nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  prevPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  trackById(index: number, item: NewsReleaseView): number {
    return item.id ?? index;
  }

  private prepareItems(page: NewsReleasePage): NewsReleaseView[] {
    const sorted = this.sortItems(page.news_releases || [], page.sortMode);
    return sorted.map((item) => ({
      ...item,
      logoUrl: this.service.getPreferredMediaUrl(item.logo ?? page.defaultLogo)
    }));
  }

  private sortItems(items: NewsRelease[], sortMode: NewsReleasePage['sortMode']): NewsRelease[] {
    if (sortMode === 'manual_sortOrder_asc') {
      return [...items].sort((a, b) => {
        const aOrder = Number.isFinite(a.sortOrder) ? (a.sortOrder as number) : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(b.sortOrder) ? (b.sortOrder as number) : Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return this.compareByDateDesc(a, b);
      });
    }

    if (sortMode === 'publishDate_asc') {
      return [...items].sort((a, b) => this.compareByDateAsc(a, b));
    }

    return [...items].sort((a, b) => this.compareByDateDesc(a, b));
  }

  private compareByDateDesc(a: NewsRelease, b: NewsRelease): number {
    const dateDiff = new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  }

  private compareByDateAsc(a: NewsRelease, b: NewsRelease): number {
    const dateDiff = new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdDiff !== 0) return createdDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  }
}
