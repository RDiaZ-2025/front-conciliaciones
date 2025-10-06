import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/typeorm.config';
import { UserActionLog } from '../models/UserActionLog';
import { JWTPayload } from '../types';

interface LoggingRequest extends Request {
    user?: JWTPayload;
    startTime?: number;
}

/**
 * Middleware to log all user actions to the database
 * Captures request details, user information, and response data
 */
export const actionLogger = async (req: LoggingRequest, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    req.startTime = startTime;

    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any = null;
    let responseSent = false;

    res.send = function(body: any) {
        if (!responseSent) {
            responseBody = body;
            responseSent = true;
            logAction();
        }
        return originalSend.call(this, body);
    };

    res.json = function(body: any) {
        if (!responseSent) {
            responseBody = body;
            responseSent = true;
            logAction();
        }
        return originalJson.call(this, body);
    };

    const logAction = async (): Promise<void> => {
        try {
            const endTime = Date.now();
            const duration = endTime - startTime;

            const userActionLogRepository = AppDataSource.getRepository(UserActionLog);

            const action = determineAction(req.method, req.path);
            const resourceInfo = extractResourceInfo(req.path, req.body);

            const logData = {
                userId: req.user?.userId || null,
                method: req.method,
                url: req.originalUrl || req.url,
                action: action,
                resourceType: resourceInfo.type,
                resourceId: resourceInfo.id,
                statusCode: res.statusCode,
                ipAddress: getClientIpAddress(req),
                userAgent: req.get('User-Agent') || null,
                requestBody: shouldLogRequestBody(req) ? sanitizeRequestBody(req.body) : null,
                responseBody: shouldLogResponseBody(req, res) ? sanitizeResponseBody(responseBody) : null,
                metadata: extractMetadata(req, res),
                duration: duration,
                errorMessage: res.statusCode >= 400 ? extractErrorMessage(responseBody) : null
            };

            const userActionLog = UserActionLog.createFromRequest(logData);
            await userActionLogRepository.save(userActionLog);

        } catch (error) {
            console.error('Error logging user action:', error);
        }
    };

    res.on('finish', () => {
        if (!responseSent) {
            responseSent = true;
            logAction();
        }
    });

    next();
};

/**
 * Determine the action type based on HTTP method and path
 */
function determineAction(method: string, path: string): string {
    const pathSegments = path.split('/').filter(segment => segment);
    const resource = pathSegments[1] || 'UNKNOWN';

    switch (method.toUpperCase()) {
        case 'GET':
            if (path.includes('/health')) return 'HEALTH_CHECK';
            if (pathSegments.length > 2) return `GET_${resource.toUpperCase()}`;
            return `LIST_${resource.toUpperCase()}`;
        case 'POST':
            if (path.includes('/login')) return 'LOGIN';
            if (path.includes('/logout')) return 'LOGOUT';
            if (path.includes('/register')) return 'REGISTER';
            return `CREATE_${resource.toUpperCase()}`;
        case 'PUT':
        case 'PATCH':
            return `UPDATE_${resource.toUpperCase()}`;
        case 'DELETE':
            return `DELETE_${resource.toUpperCase()}`;
        default:
            return `${method.toUpperCase()}_${resource.toUpperCase()}`;
    }
}

/**
 * Extract resource type and ID from the request path and body
 */
function extractResourceInfo(path: string, body: any): { type: string | null; id: string | null } {
    const pathSegments = path.split('/').filter(segment => segment);
    
    if (pathSegments.length < 2) {
        return { type: null, id: null };
    }

    const resource = pathSegments[1];
    let resourceType: string | null = null;
    let resourceId: string | null = null;

    switch (resource) {
        case 'auth':
            resourceType = 'AUTH';
            break;
        case 'users':
            resourceType = 'USER';
            if (pathSegments[2] && pathSegments[2] !== 'search') {
                resourceId = pathSegments[2];
            }
            break;
        case 'production':
            resourceType = 'PRODUCTION_REQUEST';
            if (pathSegments[2]) {
                resourceId = pathSegments[2];
            }
            break;
        case 'load-documents':
            resourceType = 'DOCUMENT';
            if (body && body.id) {
                resourceId = body.id.toString();
            }
            break;
        case 'menus':
            resourceType = 'MENU';
            if (pathSegments[2]) {
                resourceId = pathSegments[2];
            }
            break;
        default:
            resourceType = resource.toUpperCase();
    }

    if (!resourceId && body && body.id) {
        resourceId = body.id.toString();
    }

    return { type: resourceType, id: resourceId };
}

/**
 * Get client IP address from request
 */
function getClientIpAddress(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.connection.remoteAddress || req.socket.remoteAddress || null;
}

/**
 * Determine if request body should be logged
 */
function shouldLogRequestBody(req: Request): boolean {
    const method = req.method.toUpperCase();
    const path = req.path;

    if (method === 'GET' || method === 'DELETE') {
        return false;
    }

    if (path.includes('/login') || path.includes('/register')) {
        return false;
    }

    return true;
}

/**
 * Determine if response body should be logged
 */
function shouldLogResponseBody(req: Request, res: Response): boolean {
    if (res.statusCode >= 400) {
        return true;
    }

    if (req.path.includes('/health')) {
        return false;
    }

    const contentType = res.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
        return true;
    }

    return false;
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key', 'authorization'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Sanitize response body to remove sensitive information
 */
function sanitizeResponseBody(body: any): any {
    if (!body || typeof body !== 'object') {
        return body;
    }

    try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        const sanitized = { ...parsed };
        
        const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key'];
        
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        if (sanitized.data && typeof sanitized.data === 'object') {
            for (const field of sensitiveFields) {
                if (sanitized.data[field]) {
                    sanitized.data[field] = '[REDACTED]';
                }
            }
        }

        return sanitized;
    } catch (error) {
        return body;
    }
}

/**
 * Extract metadata from request and response
 */
function extractMetadata(req: Request, res: Response): any {
    return {
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        referer: req.get('Referer'),
        origin: req.get('Origin'),
        responseContentType: res.get('Content-Type'),
        responseContentLength: res.get('Content-Length')
    };
}

/**
 * Extract error message from response body
 */
function extractErrorMessage(responseBody: any): string | null {
    if (!responseBody) return null;

    try {
        const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
        return parsed.message || parsed.error || parsed.details || null;
    } catch (error) {
        return responseBody.toString();
    }
}

/**
 * Middleware to skip logging for specific routes
 */
export const skipLogging = (req: Request, res: Response, next: NextFunction): void => {
    (req as any).skipLogging = true;
    next();
};

/**
 * Check if logging should be skipped for this request
 */
export const shouldSkipLogging = (req: Request): boolean => {
    return (req as any).skipLogging === true;
};