import { version } from "./version.js";

/**
 * Siedler Logic – zentraler Logger
 *
 * Alle normalen console.log/info/warn/error/debug-Ausgaben werden automatisch
 * mit einem einheitlichen Siedler-Header versehen. Bestehende Module müssen
 * dafür nicht sofort umgebaut werden.
 *
 * Log-Level:
 *   debug < info < warn < error
 * Standard: info
 *
 * Optional kann vor dem Laden des Packs gesetzt werden:
 *   globalThis.SIEDLER_LOG_LEVEL = "debug";
 */

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
const DEFAULT_LEVEL = "info";
const PREFIX = `[Siedler Logic ${version}]`;

const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: typeof console.debug === "function" ? console.debug.bind(console) : console.log.bind(console)
};

function normalizeLevel(value) {
    const level = String(value ?? DEFAULT_LEVEL).toLowerCase();
    return LEVELS[level] !== undefined ? level : DEFAULT_LEVEL;
}

let currentLevel = normalizeLevel(globalThis.SIEDLER_LOG_LEVEL);

function shouldLog(level) {
    return LEVELS[level] >= LEVELS[currentLevel];
}

function format(level, args) {
    return [`${PREFIX} [${level.toUpperCase()}]`, ...args];
}

function write(level, args) {
    if (!shouldLog(level)) return;
    originalConsole[level](...format(level, args));
}

export function setLogLevel(level) {
    currentLevel = normalizeLevel(level);
    originalConsole.info(...format("info", [`Log-Level geändert: ${currentLevel}`]));
    return currentLevel;
}

export function getLogLevel() {
    return currentLevel;
}

export function createLogger(moduleName = "Core") {
    const modulePrefix = `[${moduleName}]`;
    const scoped = (level, args) => write(level, [modulePrefix, ...args]);

    return Object.freeze({
        debug: (...args) => scoped("debug", args),
        info: (...args) => scoped("info", args),
        log: (...args) => scoped("info", args),
        success: (...args) => scoped("info", ["✓", ...args]),
        warn: (...args) => scoped("warn", args),
        error: (...args) => scoped("error", args),
        exception: (label, error) => scoped("error", [label, error]),
        setLevel: setLogLevel,
        getLevel: getLogLevel
    });
}

/**
 * Ersetzt die globalen Console-Funktionen durch die Siedler-Varianten.
 * Dadurch profitieren auch bestehende Module von der neuen Log-Struktur.
 */
function installConsoleBridge() {
    const bridge = {
        log: (...args) => write("info", args),
        info: (...args) => write("info", args),
        warn: (...args) => write("warn", args),
        error: (...args) => write("error", args),
        debug: (...args) => write("debug", args)
    };

    for (const [method, handler] of Object.entries(bridge)) {
        try {
            console[method] = handler;
        } catch (error) {
            originalConsole.warn(`${PREFIX} [WARN] Konnte console.${method} nicht überschreiben.`, error);
        }
    }
}

installConsoleBridge();

export const logger = createLogger("Core");
export const log = logger;
