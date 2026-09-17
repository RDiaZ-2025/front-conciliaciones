import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, Renderer2, inject } from '@angular/core';
import { icons } from 'lucide';

@Component({
  selector: 'lucide-icon',
  standalone: true,
  template: ``,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      width: 1.2em;
      height: 1.2em;
      vertical-align: middle;
    }
    :host ::ng-deep svg {
      width: 100%;
      height: 100%;
      stroke: currentColor;
    }
  `]
})
export class LucideIconComponent implements OnInit, OnChanges {
  @Input() name!: string;
  @Input() size?: string | number;
  @Input() color?: string;
  @Input() strokeWidth?: string | number;

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  ngOnInit() {
    this.renderIcon();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['name'] && !changes['name'].firstChange) {
      this.renderIcon();
    }
  }

  private readonly iconAliases: Record<string, string> = {
    'users': 'Users',
    'user': 'User',
    'inbox': 'Inbox',
    'sliders-h': 'SlidersHorizontal',
    'sliders': 'Sliders',
    'file-edit': 'FilePenLine',
    'database': 'Database',
    'lightbulb': 'Lightbulb',
    'rocket': 'Rocket',
    'chart-line': 'LineChart',
    'tag': 'Tag'
  };

  private resolveIconName(name: string): string {
    if (!name) return '';
    let clean = name.trim();
    // Handle 'pi pi-xxx' or 'pi-xxx'
    clean = clean.replace(/^pi\s+pi-/, '').replace(/^pi-/, '').replace(/^pi\s+/, '');
    const tokens = clean.split(/\s+/);
    const mainToken = tokens.find(t => !t.startsWith('text-') && !t.startsWith('bg-') && !t.startsWith('p-')) || tokens[0];
    const key = mainToken.toLowerCase();

    if (this.iconAliases[key]) {
      return this.iconAliases[key];
    }

    return this.toPascalCase(mainToken);
  }

  private renderIcon() {
    if (!this.name) return;

    const resolvedName = this.resolveIconName(this.name);
    let icon = (icons as any)[resolvedName];

    if (!icon) {
      const directPascal = this.toPascalCase(this.name);
      icon = (icons as any)[directPascal];
    }

    if (!icon) {
      icon = (icons as any)['Circle'] || (icons as any)['HelpCircle'];
    }

    if (icon) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      const defaultSize = this.size ? String(this.size) : '24';
      svg.setAttribute('width', defaultSize);
      svg.setAttribute('height', defaultSize);
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', this.color || 'currentColor');
      svg.setAttribute('stroke-width', this.strokeWidth ? String(this.strokeWidth) : '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('class', 'lucide lucide-svg lucide-' + this.name);

      for (const node of icon) {
        const [tagName, attrs] = node;
        const child = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        for (const [attrName, attrValue] of Object.entries(attrs)) {
          child.setAttribute(attrName, attrValue as string);
        }
        svg.appendChild(child);
      }

      this.el.nativeElement.innerHTML = '';
      this.el.nativeElement.appendChild(svg);
    }
  }

  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}
