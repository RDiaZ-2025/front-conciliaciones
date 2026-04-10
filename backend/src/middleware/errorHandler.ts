import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error | unknown, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    if (err instanceof Error && err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            error: err.message
        });
    }

    if (err instanceof Error && err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized',
            error: err.message
        });
    }

    const message = err instanceof Error ? err.message : String(err);

    if (message === 'Production request not found') {
        return res.status(404).json({
            success: false,
            message: message
        });
    }

    const stack = err instanceof Error ? err.stack : undefined;

    return res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? message : 'An unexpected error occurred',
        stack: process.env.NODE_ENV === 'development' ? stack : undefined
    });
};
