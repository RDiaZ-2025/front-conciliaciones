import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductionRequest, Objective, Gender, AgeRange, SocioeconomicLevel, FormatType, RightsDuration, Product, ProductionRequestHistory } from '../pages/production/production.models';

@Injectable({
  providedIn: 'root'
})
export class ProductionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/production`; // Updated to match likely route mount point
  private objectiveUrl = `${environment.apiUrl}/objectives`;
  private audienceUrl = `${environment.apiUrl}/audience`;
  private productionOptionsUrl = `${environment.apiUrl}/production-options`;

  getProductionRequests(): Observable<ProductionRequest[]> {
    return this.http.get<ProductionRequest[]>(this.apiUrl);
  }

  getProductionRequest(id: number): Observable<ProductionRequest> {
    return this.http.get<ProductionRequest>(`${this.apiUrl}/${id}`);
  }

  // Alias for compatibility
  getProductionRequestById(id: number): Observable<ProductionRequest> {
    return this.getProductionRequest(id);
  }

  createProductionRequest(request: Partial<ProductionRequest>): Observable<ProductionRequest> {
    return this.http.post<ProductionRequest>(this.apiUrl, request);
  }

  updateProductionRequest(id: number, request: Partial<ProductionRequest>): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}`, request);
  }

  deleteProductionRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getHistory(id: number): Observable<ProductionRequestHistory[]> {
    return this.http.get<ProductionRequestHistory[]>(`${this.apiUrl}/${id}/history`);
  }

  moveRequest(id: number, stage: string): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/move`, { stage });
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }
  
  // Objective methods
  getObjectives(): Observable<Objective[]> {
    return this.http.get<Objective[]>(this.objectiveUrl);
  }

  // Audience methods
  getGenders(): Observable<Gender[]> {
    return this.http.get<Gender[]>(`${this.audienceUrl}/genders`);
  }

  getAgeRanges(): Observable<AgeRange[]> {
    return this.http.get<AgeRange[]>(`${this.audienceUrl}/age-ranges`);
  }

  getSocioeconomicLevels(): Observable<SocioeconomicLevel[]> {
    return this.http.get<SocioeconomicLevel[]>(`${this.audienceUrl}/socioeconomic-levels`);
  }

  // Production Options methods
  getFormatTypes(): Observable<FormatType[]> {
    return this.http.get<FormatType[]>(`${this.apiUrl}/format-types`);
  }

  getRightsDurations(): Observable<RightsDuration[]> {
    return this.http.get<RightsDuration[]>(`${this.apiUrl}/rights-durations`);
  }
}
