import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export abstract class BaseApiService {
  protected http = inject(HttpClient);
  protected baseApiUrl = environment.apiUrl;
}
