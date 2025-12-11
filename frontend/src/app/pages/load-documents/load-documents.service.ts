import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadDocument } from './load-documents.models';

@Injectable({
  providedIn: 'root'
})
export class LoadDocumentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/load-documents`;

  getDocuments(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
