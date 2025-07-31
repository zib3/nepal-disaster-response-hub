import logger from '../config/logger.js';

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
};

export default errorHandler;
