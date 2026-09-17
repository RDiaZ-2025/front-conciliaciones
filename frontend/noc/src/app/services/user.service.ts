import { BaseApiService } from './base-api.service';
import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { SYSTEM_MODULES } from '../models/common/modules-config';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseApiService {

  private cachedModules: any[] | null = null;

  getSystemModules(forceRefresh = false): Observable<any[]> {
    if (this.cachedModules && !forceRefresh) {
      return new Observable<any[]>(observer => {
        observer.next(this.cachedModules!);
        observer.complete();
      });
    }
    return this.http.get<any[]>(`${environment.apiUrl}/system-modules`).pipe(
      map(backendModules => {

        return SYSTEM_MODULES.map(sysMod => {
          const backMod = backendModules.find(bm => bm.name === sysMod.name);

          return {
            ...sysMod,
            submodules: sysMod.submodules.map(sysSub => {
              let backSub: any = null;
              if (backMod) {
                backSub = backMod.submodules.find((bs: any) => bs.code === sysSub.code);
              }

              return {
                ...sysSub,
                is_under_maintenance: backSub ? backSub.is_under_maintenance : false,
                maintenance_message: backSub ? backSub.maintenance_message : 'Módulo en mantenimiento',
                is_disabled: backSub ? backSub.is_disabled : false
              };
            })
          };
        });
      }),
      catchError(err => {
        console.warn("FastAPI offline, defaulting to local SYSTEM_MODULES configuration.", err);
        return of(SYSTEM_MODULES.map(sysMod => ({
          ...sysMod,
          submodules: sysMod.submodules.map(sysSub => ({
            ...sysSub,
            is_under_maintenance: false,
            maintenance_message: 'Módulo en mantenimiento',
            is_disabled: false
          }))
        })));
      }),
      tap(modules => this.cachedModules = modules)
    );
  }
}
