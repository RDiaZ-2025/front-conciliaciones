import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }

  transform(value: string): SafeHtml {
    if (!value) return '';

    let html = value.replace(/(\\\\n|\\n|\\\\r|\\r)/g, '\n');

    html = html.replace(/^###\s+(.*$)/gim, '<h3 class="text-lg font-semibold mt-3 mb-2 text-primary">$1</h3>');
    html = html.replace(/^##\s+(.*$)/gim, '<h2 class="text-xl font-semibold mt-3 mb-2 text-primary">$1</h2>');
    html = html.replace(/^#\s+(.*$)/gim, '<h1 class="text-2xl font-semibold mt-3 mb-2 text-primary">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    html = html.replace(/^(\d+\.)\s+(.*$)/gim, '<li class="ml-4 mb-1 list-none"><span class="font-semibold">$1</span> $2</li>');

    html = html.replace(/^\*\s+(.*$)/gim, '<li class="ml-4 mb-1">$1</li>');
    html = html.replace(/^-\s+(.*$)/gim, '<li class="ml-4 mb-1">$1</li>');

    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    html = html.replace(/\n/g, '<br>');

    html = html.replace(/(<br>)+(<h[1-3]>)/g, '$2');
    html = html.replace(/(<\/h[1-3]>)(<br>)+/g, '$1');
    html = html.replace(/(<br>)+(<li)/g, '$2');
    html = html.replace(/(<\/li>)(<br>)+/g, '$1');

    html = html.replace(/(<li.*?>.*?<\/li>)(?!<li)/g, '$1</ul>');
    html = html.replace(/(?<!<\/li>)<li/g, '<ul class="mt-2 mb-2 pl-3"><li');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
