import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'cachedImage',
  standalone: true
})
export class CachedImagePipe implements PipeTransform {
  transform(url: any): any {
    if (!url) return '';
    return url;
  }
}
