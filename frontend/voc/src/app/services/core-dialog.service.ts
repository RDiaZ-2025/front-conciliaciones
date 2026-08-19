import { inject, Injectable, Type } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Injectable({
  providedIn: 'root'
})
export class CoreDialogService {
  private dialogService = inject(DialogService);

  open(componentType: Type<any>, config: DynamicDialogConfig): any {
    const defaultStyle = {
      width: config.width || '50vw',
      contentStyle: config.contentStyle || { overflow: 'auto' },
      baseZIndex: config.baseZIndex || 10000,
      breakpoints: config.breakpoints || {
        '960px': '75vw',
        '640px': '90vw'
      }
    };
    const mergedConfig = { ...defaultStyle, ...config };
    return this.dialogService.open(componentType, mergedConfig);
  }
}
