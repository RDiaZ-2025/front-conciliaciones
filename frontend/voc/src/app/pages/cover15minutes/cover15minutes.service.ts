import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoverHistoryItem } from './cover15minutes.models';

@Injectable({
  providedIn: 'root'
})
export class Cover15MinutesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/covers-15-minutes`;

  getAllCovers(): Observable<{ success: boolean; data: CoverHistoryItem[] }> {
    return this.http.get<{ success: boolean; data: CoverHistoryItem[] }>(this.apiUrl);
  }

  createCover(data: { uploaderLog: string, url: string }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}
