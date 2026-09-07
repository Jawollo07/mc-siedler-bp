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
 * Wiederholte WARN-Meldungen werden automatisch rate-limitiert, damit Tick- und
 * Event-Handler die Server-Konsole nicht mit derselben Meldung fluten.
 * Standard: maximal eine identische WARN-Meldung pro 10 Sekunden.
 *
 * Optional kann vor dem Laden des Packs gesetzt werden:
 *   globalThis.SIEDLER_LOG_LEVEL = "debug";
 *   globalThis.SIEDLER_WARN_RATE_LIMIT_MS = 10000;
 */

const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
const DEFAULT_LEVEL = "info";
const DEFAULT_WARN_RATE_LIMIT_MS = 10_000;
const MAX_WARN_ENTRIES = 500;
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

function normalizeRateLimit(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_WARN_RATE_LIMIT_MS;
}

let currentLevel = normalizeLevel(globalThis.SIEDLER_LOG_LEVEL);
let warnRateLimitMs = normalizeRateLimit(globalThis.SIEDLER_WARN_RATE_LIMIT_MS);
const warningState = new Map();

function shouldLog(level) {
    return LEVELS[level] >= LEVELS[currentLevel];
}

function format(level, args) {
    return [`${PREFIX} [${level.toUpperCase()}]`, ...args];
}

function createWarningKey(args) {
    return args.map((value) => {
        if (value instanceof Error) return `${value.name}:${value.message}`;
        if (typeof value === "object" && value !== null) {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }).join(" | ");
}

function writeWarning(args) {
    if (!shouldLog("warn")) return;

    const now = Date.now();
    const key = createWarningKey(args);
    const previous = warningState.get(key);

    if (previous && warnRateLimitMs > 0 && now - previous.lastLoggedAt < warnRateLimitMs) {
        previous.suppressed += 1;
        previous.lastSeenAt = now;
        return;
    }

    if (previous?.suppressed > 0) {
        originalConsole.warn(...format("warn", [
            `(${previous.suppressed} weitere identische WARN-Meldungen unterdrückt)`,
            ...args
        ]));
    } else {
        originalConsole.warn(...format("warn", args));
    }

    warningState.set(key, {
        lastLoggedAt: now,
        lastSeenAt: now,
        suppressed: 0
    });

    if (warningState.size > MAX_WARN_ENTRIES) {
        const oldestKey = warningState.keys().next().value;
        if (oldestKey !== undefined) warningState.delete(oldestKey);
    }
}

function write(level, args) {
    if (level === "warn") {
        writeWarning(args);
        return;
    }

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

export function setWarnRateLimit(milliseconds) {
    warnRateLimitMs = normalizeRateLimit(milliseconds);
    warningState.clear();
    originalConsole.info(...format("info", [`WARN-Rate-Limit geändert: ${warnRateLimitMs} ms`]));
    return warnRateLimitMs;
}

export function getWarnRateLimit() {
    return warnRateLimitMs;
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
        getLevel: getLogLevel,
        setWarnRateLimit,
        getWarnRateLimit
    });
}

/**
 * Ersetzt die globalen Console-Funktionen durch die Siedler-Varianten.
 * Dadurch profitieren auch bestehende Module von der neuen Log-Struktur und
 * vom WARN-Rate-Limit, ohne dass jedes Modul sofort angepasst werden muss.
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
