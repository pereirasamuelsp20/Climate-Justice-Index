import { supabase } from '../config/supabase.js';
export const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
            status: 401
        });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            res.status(401).json({
                error: { code: 'UNAUTHORIZED', message: error?.message || 'Invalid or expired token' },
                status: 401
            });
            return;
        }
        req.user = { id: user.id, email: user.email };
        next();
    }
    catch (error) {
        res.status(500).json({
            error: { code: 'AUTH_ERROR', message: 'Error verifying authentication token' },
            status: 500
        });
    }
};
