import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ProductionRequest, MOCK_PRODUCTION_REQUESTS, Product } from '../pages/production/production.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/production`;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  getProductionRequestById(id: string): Observable<ProductionRequest> {
    return this.http.get<ProductionRequest>(`${this.apiUrl}/${id}`);
  }

  getProductionRequests(): Observable<ProductionRequest[]> {
    return this.http.get<ProductionRequest[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching production requests, using mock data', error);
        return of(MOCK_PRODUCTION_REQUESTS);
      })
    );
  }

  createProductionRequest(request: Partial<ProductionRequest>): Observable<ProductionRequest> {
    return this.http.post<ProductionRequest>(this.apiUrl, request);
  }

  updateProductionRequest(id: string, request: Partial<ProductionRequest>): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}`, request);
  }

  deleteProductionRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  moveRequest(id: string, stage: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/move`, { stage });
  }

  getHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/history`);
  }
}
