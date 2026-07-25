const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const logsDir = process.env.LOGS_DIR 
    ? path.resolve(process.env.LOGS_DIR) 
    : path.join(__dirname, '../../logs');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const appLogPath = path.join(logsDir, 'app.log');
const errorLogPath = path.join(logsDir, 'error.log');

function formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
}

function writeLog(filePath, message) {
    fs.appendFile(filePath, message, (err) => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });
}

const logger = {
    info(message) {
        const formatted = formatMessage('INFO', message);
        console.log(formatted.trim());
        writeLog(appLogPath, formatted);
    },
    warn(message) {
        const formatted = formatMessage('WARN', message);
        console.warn(formatted.trim());
        writeLog(appLogPath, formatted);
    },
    error(message, errorObj = null) {
        const errorDetails = errorObj ? ` | Details: ${errorObj.stack || errorObj.message || errorObj}` : '';
        const formatted = formatMessage('ERROR', `${message}${errorDetails}`);
        console.error(formatted.trim());
        writeLog(appLogPath, formatted);
        writeLog(errorLogPath, formatted);
    }
};

module.exports = logger;
