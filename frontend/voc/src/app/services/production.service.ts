import { BaseApiService } from './base-api.service';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductionRequest } from '../models/common/production-request';
import { Objective } from '../models/common/objective';
import { Gender } from '../models/common/gender';
import { AgeRange } from '../models/common/age-range';
import { SocioeconomicLevel } from '../models/common/socioeconomic-level';
import { FormatType } from '../models/common/format-type';
import { RightsDuration } from '../models/common/rights-duration';
import { Product } from '../models/common/product';
import { ProductionRequestHistory } from '../models/common/production-request-history';
import { Status } from '../models/common/status';

@Injectable({
  providedIn: 'root'
})
export class ProductionService extends BaseApiService {
  private apiUrl = `${environment.apiUrl}/production`; // Updated to match likely route mount point
  private objectiveUrl = `${environment.apiUrl}/objectives`;
  private audienceUrl = `${environment.apiUrl}/audience`;
  private statusUrl = `${environment.apiUrl}/statuses`;

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

  updateStepGeneral(id: number, request: Partial<ProductionRequest>): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/general`, request);
  }

  updateStepCustomer(id: number, data: any): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/customer`, { customerData: data });
  }

  updateStepCampaign(id: number, data: any, status?: string, deliveryDate?: string): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/campaign`, { campaignDetail: data, status, deliveryDate });
  }

  updateStepAudience(id: number, data: any): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/audience`, { audienceData: data });
  }

  updateStepProduction(id: number, data: any): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/production`, { productionInfo: data });
  }

  deleteProductionRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getHistory(id: number): Observable<ProductionRequestHistory[]> {
    return this.http.get<ProductionRequestHistory[]>(`${this.apiUrl}/${id}/history`);
  }

  moveRequest(id: number, stage: string, data?: any): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/move`, { stage, ...data });
  }

  saveMaterialData(id: number, data: any): Observable<ProductionRequest> {
    return this.http.put<ProductionRequest>(`${this.apiUrl}/${id}/material-data`, { materialData: data });
  }

  addMaterialRegister(id: number, register: { category: string, type: string, solution: string, jsonRequest: any }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/material`, register);
  }

  getMaterialRegisters(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/material`);
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

  getWorkflowStages(): Observable<{ id: string; label: string }[]> {
    return this.http.get<{ id: string; label: string }[]>(`${this.apiUrl}/workflow-stages`);
  }

  getRequestTypes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/request-types`);
  }

  getStatuses(): Observable<Status[]> {
    return this.http.get<Status[]>(this.statusUrl);
  }

  getDynamicFormFields(formId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/forms/${formId}/fields`);
  }

  submitDynamicForm(formId: number, values: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/submissions`, { formId, values });
  }

  getDynamicSubmissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/submissions`);
  }

  adminGetForms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/forms`);
  }

  adminCreateForm(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin/forms`, data);
  }

  adminUpdateForm(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/forms/${id}`, data);
  }

  adminDeleteForm(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/forms/${id}`);
  }

  adminSaveFields(formId: number, fields: any[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/admin/forms/${formId}/fields`, fields);
  }

  adminGetStages(formId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/forms/${formId}/stages`);
  }

  adminSaveStages(formId: number, stages: any[]): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/admin/forms/${formId}/stages`, stages);
  }

  getPendingApprovals(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/approvals/pending`);
  }

  actionApproval(stateId: number, action: 'approve' | 'reject', notes: string, formValues?: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/approvals/${stateId}/action`, { action, notes, formValues });
  }
}
