/**
 * Selective Logger
 * Suppresses console.log/info/warn in production Mode.
 * Only allows console.error and critical debug info.
 */

const isProd = import.meta.env.PROD;

export const logger = {
    log: (...args: any[]) => {
        if (!isProd) console.log(...args);
    },
    info: (...args: any[]) => {
        if (!isProd) console.info(...args);
    },
    warn: (...args: any[]) => {
        if (!isProd) console.warn(...args);
    },
    error: (...args: any[]) => {
        console.error(...args);
    },
    debug: (...args: any[]) => {
        if (!isProd) console.debug(...args);
    },
};

export default logger;
