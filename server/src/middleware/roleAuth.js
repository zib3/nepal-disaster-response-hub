// Role-based authorization middleware
const roleAuth = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user exists (should be set by auth middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No user found.'
            });
        }

        // Check if user has required role
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};

export default roleAuth;
