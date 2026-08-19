import { BaseApiService } from './base-api.service';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Customer {
  id?: number;
  documentType: string;
  documentNumber: string;
  businessName: string | null;
  email: string;
  phoneNumber: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService extends BaseApiService {
  private apiUrl = `${this.baseApiUrl}/customers`;

  getCustomers(params?: {
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }): Observable<{ success: boolean; data: Customer[]; total: number }> {
    return this.http.get<{ success: boolean; data: Customer[]; total: number }>(this.apiUrl, {
      params: params as any
    });
  }

  getCustomerById(id: number): Observable<{ success: boolean; data: Customer }> {
    return this.http.get<{ success: boolean; data: Customer }>(`${this.apiUrl}/${id}`);
  }

  createCustomer(customer: Partial<Customer>): Observable<{ success: boolean; data: Customer }> {
    return this.http.post<{ success: boolean; data: Customer }>(this.apiUrl, customer);
  }

  updateCustomer(id: number, customer: Partial<Customer>): Observable<{ success: boolean; data: Customer }> {
    return this.http.put<{ success: boolean; data: Customer }>(`${this.apiUrl}/${id}`, customer);
  }

  deleteCustomer(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  bulkUpload(fileName: string, fileData: string): Observable<{
    success: boolean;
    data: {
      processed: number;
      created: number;
      updated: number;
      errors: { row: number; error: string }[];
    }
  }> {
    return this.http.post<{
      success: boolean;
      data: {
        processed: number;
        created: number;
        updated: number;
        errors: { row: number; error: string }[];
      };
    }>(`${this.apiUrl}/bulk-upload`, { fileName, fileData });
  }
}
