import { createLogger, format, transports } from 'winston';

// Define log format
const logFormat = format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        new transports.Console()
    ],
    // You can also configure to log into a file
    // transports: [
    //     new transports.File({ filename: 'error.log', level: 'error' }),
    //     new transports.File({ filename: 'combined.log' })
    // ]
});

export default logger;

