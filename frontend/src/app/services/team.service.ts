import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../pages/production/production.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/teams`;

  getTeams(): Observable<{ success: boolean; data: Team[] }> {
    return this.http.get<{ success: boolean; data: Team[] }>(this.apiUrl);
  }

  createTeam(team: Partial<Team>): Observable<{ success: boolean; data: Team }> {
    return this.http.post<{ success: boolean; data: Team }>(this.apiUrl, team);
  }
}
