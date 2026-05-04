import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
export const errorHandler = (err, req, res, next) => {
    if (err instanceof ZodError) {
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: err.issues,
            },
            status: 400
        });
        return;
    }
    // Generic handled error
    if (err.status && err.status !== 500) {
        res.status(err.status).json({
            error: {
                code: err.code || 'ERROR',
                message: err.message,
            },
            status: err.status
        });
        return;
    }
    // Unhandled 500
    logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled Exception');
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
        },
        status: 500
    });
};
