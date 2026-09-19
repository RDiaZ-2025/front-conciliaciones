import { BaseApiService } from './base-api.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../models/common/team';
import { Subteam } from '../models/common/subteam';
import { User } from './user.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamService extends BaseApiService {
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

  // Subteams
  getSubteamsByTeam(teamId: number): Observable<{ success: boolean; data: Subteam[] }> {
    return this.http.get<{ success: boolean; data: Subteam[] }>(`${this.apiUrl}/${teamId}/subteams`);
  }

  createSubteam(teamId: number, data: { name: string; description?: string; leaderId?: number | null; userIds?: number[] }): Observable<{ success: boolean; data: Subteam }> {
    return this.http.post<{ success: boolean; data: Subteam }>(`${this.apiUrl}/${teamId}/subteams`, data);
  }

  updateSubteam(subteamId: number, data: { name?: string; description?: string; leaderId?: number | null; isActive?: boolean; userIds?: number[] }): Observable<{ success: boolean; data: Subteam }> {
    return this.http.put<{ success: boolean; data: Subteam }>(`${this.apiUrl}/subteams/${subteamId}`, data);
  }

  deleteSubteam(subteamId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/subteams/${subteamId}`);
  }

  getSubteamUsers(subteamId: number): Observable<{ success: boolean; data: User[] }> {
    return this.http.get<{ success: boolean; data: User[] }>(`${this.apiUrl}/subteams/${subteamId}/users`);
  }

  updateSubteamUsers(subteamId: number, userIds: number[]): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.apiUrl}/subteams/${subteamId}/users`, { userIds });
  }
}
