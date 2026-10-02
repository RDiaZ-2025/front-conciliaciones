import { Injectable, signal, computed } from '@angular/core';
import { Observable, catchError, of, timeout, tap } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { APP_FRONTEND_VERSION, APP_FRONTEND_VERSION_DATE } from '../../environments/version';

export interface SystemHealthResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'down';
  version?: string;
  versionDate?: string;
  backendVersion?: string;
  backendVersionDate?: string;
  message: string;
  timestamp: string;
  environment: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  database: {
    status: 'connected' | 'disconnected';
    name: string;
  };
  serviceBus: {
    hasConnectionString: boolean;
    detectedEnvVar: string | null;
    queueName: string;
    clientInitialized: boolean;
    senderReady: boolean;
    receiverListening: boolean;
    wsModuleStatus: string;
    lastError: string | null;
  };
  system: {
    nodeVersion: string;
    platform: string;
    memory: {
      rssMB: number;
      heapUsedMB: number;
      heapTotalMB: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class SystemHealthService extends BaseApiService {
  private _healthData = signal<SystemHealthResponse | null>(null);
  public healthData = this._healthData.asReadonly();

  // Versión del Frontend (Directamente desde package.json)
  public frontendVersion = signal<string | undefined>(APP_FRONTEND_VERSION).asReadonly();
  public frontendVersionDate = signal<string | undefined>(APP_FRONTEND_VERSION_DATE).asReadonly();

  // Versión del Backend (Obtenida dinámicamente desde /health)
  public backendVersion = computed<string | undefined>(() => this._healthData()?.backendVersion || this._healthData()?.version || undefined);
  public backendVersionDate = computed<string | undefined>(() => this._healthData()?.backendVersionDate || this._healthData()?.versionDate || undefined);

  // Retrocompatibilidad
  public appVersion = computed<string>(() => this.backendVersion() || '');
  public appVersionDate = computed<string>(() => this.backendVersionDate() || '');

  getHealth(): Observable<SystemHealthResponse> {
    const rootUrl = this.baseApiUrl.replace(/\/api\/?$/, '');
    const healthUrl = `${rootUrl}/health`;

    return this.http.get<SystemHealthResponse>(healthUrl).pipe(
      timeout(10000),
      tap(data => this._healthData.set(data)),
      catchError(err => {
        console.error('Error fetching system health:', err);
        const fallbackResponse: SystemHealthResponse = {
          success: false,
          status: 'down' as const,
          message: err.message || 'No se pudo contactar al servidor',
          timestamp: new Date().toISOString(),
          environment: 'desconocido',
          uptime: { seconds: 0, formatted: '0s' },
          database: { status: 'disconnected' as const, name: 'desconocido' },
          serviceBus: {
            hasConnectionString: false,
            detectedEnvVar: null,
            queueName: 'desconocida',
            clientInitialized: false,
            senderReady: false,
            receiverListening: false,
            wsModuleStatus: 'error',
            lastError: err.message
          },
          system: {
            nodeVersion: 'N/A',
            platform: 'N/A',
            memory: { rssMB: 0, heapUsedMB: 0, heapTotalMB: 0 }
          }
        };
        this._healthData.set(fallbackResponse);
        return of(fallbackResponse);
      })
    );
  }
}
