import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../pages/production/production.models';
import { User } from './user.service';
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

  getUsersByTeam(teamId: number): Observable<{ success: boolean; data: User[] }> {
    return this.http.get<{ success: boolean; data: User[] }>(`${this.apiUrl}/${teamId}/users`);
  }

  updateTeam(id: number, team: Partial<Team>): Observable<{ success: boolean; data: Team }> {
    return this.http.put<{ success: boolean; data: Team }>(`${this.apiUrl}/${id}`, team);
  }

  deleteTeam(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  updateTeamUsers(teamId: number, userIds: number[]): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.apiUrl}/${teamId}/users`, { userIds });
  }
}
