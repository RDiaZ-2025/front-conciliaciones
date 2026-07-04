import { BaseApiService } from '../../services/base-api.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadDocument } from '../../models/common/load-document';

@Injectable({
  providedIn: 'root'
})
export class LoadDocumentsService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/load-documents`;

  getDocuments(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
