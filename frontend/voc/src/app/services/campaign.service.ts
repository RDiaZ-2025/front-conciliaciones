import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Campaign {
  id?: number;
  name: string;
  teamId: number;
  slot: string;
  copy: string;
  url: string;
  startDate: Date;
  endDate: Date;
  impacts: { date: Date; quantity: number }[];
  createdAt?: Date;
  createdBy?: number;
  team?: any;
  creator?: any;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/campaigns`;

  getCampaigns(): Observable<{ success: boolean; data: Campaign[] }> {
    return this.http.get<{ success: boolean; data: Campaign[] }>(this.apiUrl);
  }

  getCampaignById(id: number): Observable<{ success: boolean; data: Campaign }> {
    return this.http.get<{ success: boolean; data: Campaign }>(`${this.apiUrl}/${id}`);
  }

  createCampaign(campaign: Campaign): Observable<{ success: boolean; data: Campaign }> {
    return this.http.post<{ success: boolean; data: Campaign }>(this.apiUrl, campaign);
  }

  updateCampaign(id: number, campaign: Partial<Campaign>): Observable<{ success: boolean; data: Campaign }> {
    return this.http.put<{ success: boolean; data: Campaign }>(`${this.apiUrl}/${id}`, campaign);
  }

  deleteCampaign(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }
}
