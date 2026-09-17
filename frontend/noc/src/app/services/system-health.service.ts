import { Injectable } from '@angular/core';
import { Observable, catchError, of, timeout } from 'rxjs';
import { BaseApiService } from './base-api.service';

export interface SystemHealthResponse {
  success: boolean;
  status: 'healthy' | 'degraded' | 'down';
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

  getHealth(): Observable<SystemHealthResponse> {
    // Normalizar baseApiUrl para consultar la ruta raíz /health
    // Funciona tanto en desarrollo local (http://localhost:22741/health) como en producción Azure (https://voc-backend.azurewebsites.net/health)
    const rootUrl = this.baseApiUrl.replace(/\/api\/?$/, '');
    const healthUrl = `${rootUrl}/health`;

    return this.http.get<SystemHealthResponse>(healthUrl).pipe(
      timeout(10000),
      catchError(err => {
        console.error('Error fetching system health:', err);
        return of({
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
        });
      })
    );
  }
}
