import { Pipe, PipeTransform, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';

@Pipe({
  name: 'cachedImage',
  standalone: true,
  pure: false
})
export class CachedImagePipe implements PipeTransform, OnDestroy {
  private lastUrl?: string;
  private cachedBlobUrl?: string;
  private cdr = inject(ChangeDetectorRef);

  transform(url: any): any {
    if (!url) return '';
    if (url === this.lastUrl) {
      return this.cachedBlobUrl || url;
    }

    this.lastUrl = url;
    
    // Revoke old blob URL if it exists
    if (this.cachedBlobUrl) {
      URL.revokeObjectURL(this.cachedBlobUrl);
      this.cachedBlobUrl = undefined;
    }

    this.loadImage(url);
    return url;
  }

  private async loadImage(url: string) {
    try {
      const cacheName = 'noc-image-cache-v1';
      const cache = await caches.open(cacheName);
      let response = await cache.match(url);

      if (!response) {
        const res = await fetch(url);
        if (res.ok) {
          await cache.put(url, res.clone());
          response = res;
        }
      }

      if (response) {
        const blob = await response.blob();
        this.cachedBlobUrl = URL.createObjectURL(blob);
        this.cdr.markForCheck();
      }
    } catch (e) {
      console.warn('CachedImagePipe failed to cache/load image:', e);
    }
  }

  ngOnDestroy() {
    if (this.cachedBlobUrl) {
      URL.revokeObjectURL(this.cachedBlobUrl);
    }
  }
}
