/**
 * Constants for Python notebook controller
 */

/**
 * Controller configuration constants
+ */
export const CONTROLLER_CONFIG = {
    ID: 'agentworkbook-controller',
    NOTEBOOK_TYPE: 'agentworkbook',
    LABEL: 'AgentWorkbook Python',
    SUPPORTED_LANGUAGES: ['python']
} as const;

/**
 * File paths and resource locations
 */
export const RESOURCE_PATHS = {
    PYODIDE_DIR: 'resources/pyodide',
    AGENTWORKBOOK_PY: 'resources/agentworkbook.py',
    PYODIDE_HOME: '/home/pyodide',
    AGENTWORKBOOK_PY_TARGET: '/home/pyodide/agentworkbook.py'
} as const;

/**
 * Timing and performance constants
 */
export const TIMING_CONFIG = {
    /** Interval for telemetry updates during cell execution (ms) */
    TELEMETRY_INTERVAL: 10_000,
    /** Default timeout for cell execution (ms) */
    DEFAULT_CELL_TIMEOUT: 300_000, // 5 minutes
    /** Maximum timeout for cell execution (ms) */
    MAX_CELL_TIMEOUT: 1_800_000, // 30 minutes
    /** Pyodide initialization timeout (ms) */
    PYODIDE_INIT_TIMEOUT: 120_000, // 2 minutes
    /** Retry delay for failed operations (ms) */
    RETRY_DELAY: 1_000
} as const;

/**
 * Output and logging configuration
 */
export const OUTPUT_CONFIG = {
    /** Maximum length for output strings */
    MAX_OUTPUT_LENGTH: 10_000,
    /** Prefix for stdout messages */
    STDOUT_PREFIX: '[Pyodide stdout]',
    /** Prefix for stderr messages */
    STDERR_PREFIX: '[Pyodide stderr]',
    /** HTML output key in Python dictionary results */
    HTML_OUTPUT_KEY: 'html'
} as const;

/**
 * Error handling configuration
 */
export const ERROR_CONFIG = {
    /** Maximum number of retry attempts */
    MAX_RETRIES: 3,
    /** Stack trace filters - patterns to exclude from error stacks */
    STACK_TRACE_FILTERS: [
        'at wasm://wasm/',
        'resources/pyodide/pyodide.asm.js',
        'node:internal/'
    ],
    /** Error types for categorization */
    ERROR_TYPES: {
        PYTHON_EXCEPTION: 'python_exception',
        INTERNAL_ERROR: 'internal_error',
        TIMEOUT_ERROR: 'timeout_error',
        IMPORT_ERROR: 'import_error',
        INITIALIZATION_ERROR: 'initialization_error'
    }
} as const;

/**
 * Progress notification configuration
 */
export const PROGRESS_CONFIG = {
    TITLE: 'Initializing AgentWorkbook kernel...',
    LOCATION: 'Notification' as const,
    CANCELLABLE: false
} as const;

/**
 * Python environment configuration
 */
export const PYTHON_ENV_CONFIG = {
    /** Environment variables to clear for clean Python environment */
    ENV_VARS_TO_CLEAR: ['PYTHONHOME', 'PYTHONPATH'],
    /** Default Python module name for AgentWorkbook */
    AGENTWORKBOOK_MODULE: '_agentworkbook'
} as const;

/**
 * Execution states and statuses
 */
export const EXECUTION_STATES = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
} as const;

/**
 * Cell execution configuration
 */
export const CELL_CONFIG = {
    /** Default execution order start */
    INITIAL_EXECUTION_ORDER: 0,
    /** Whether to support execution order */
    SUPPORTS_EXECUTION_ORDER: true,
    /** Maximum number of concurrent cell executions */
    MAX_CONCURRENT_EXECUTIONS: 1
} as const;