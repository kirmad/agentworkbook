import { PyodideInterface } from 'pyodide';
import { ErrorInfo } from './types';
import { ERROR_CONFIG } from './constants';

/**
 * Error handler for Python notebook operations
 */
export class NotebookErrorHandler {
    /**
     * Categorizes and processes errors from Python execution
     */
    static categorizeError(error: any, pyodide?: PyodideInterface): ErrorInfo {
        const originalError = error instanceof Error ? error : new Error(String(error));
        
        // Determine error type
        let errorType: ErrorInfo['type'] = 'internal_error';
        let message = originalError.message;
        let context: Record<string, any> = {};

        if (pyodide && error instanceof pyodide.ffi.PythonError) {
            errorType = 'python_exception';
            context.pythonType = error.type;
            
            // Extract Python traceback information
            const traceback = this.extractPythonTraceback(error);
            if (traceback) {
                context.traceback = traceback;
            }
        } else if (this.isTimeoutError(error)) {
            errorType = 'timeout_error';
            message = 'Code execution timed out';
        } else if (this.isImportError(error)) {
            errorType = 'import_error';
            context.missingPackages = this.extractMissingPackages(error);
        } else if (this.isInitializationError(error)) {
            errorType = 'initialization_error';
        }

        return {
            type: errorType,
            message,
            stack: this.filterStackTrace(originalError.stack),
            originalError,
            context
        };
    }

    /**
     * Creates a user-friendly error message
     */
    static createUserFriendlyMessage(errorInfo: ErrorInfo): string {
        switch (errorInfo.type) {
            case 'python_exception':
                return this.formatPythonError(errorInfo);
            case 'timeout_error':
                return 'Code execution timed out. Consider breaking your code into smaller cells or optimizing performance.';
            case 'import_error':
                return this.formatImportError(errorInfo);
            case 'initialization_error':
                return 'Failed to initialize Python environment. Please reload the notebook and try again.';
            case 'internal_error':
            default:
                return `An internal error occurred: ${errorInfo.message}`;
        }
    }

    /**
     * Suggests recovery actions based on error type
     */
    static suggestRecoveryActions(errorInfo: ErrorInfo): string[] {
        const actions: string[] = [];

        switch (errorInfo.type) {
            case 'python_exception':
                actions.push('Check your Python syntax and variable names');
                actions.push('Ensure all required variables are defined in previous cells');
                if (errorInfo.context?.traceback) {
                    actions.push('Review the traceback for the specific line causing the error');
                }
                break;

            case 'timeout_error':
                actions.push('Break your code into smaller, faster-executing cells');
                actions.push('Consider optimizing loops and data processing');
                actions.push('Use progress indicators for long-running operations');
                break;

            case 'import_error':
                if (errorInfo.context?.missingPackages?.length > 0) {
                    actions.push(`Install missing packages: ${errorInfo.context.missingPackages.join(', ')}`);
                }
                actions.push('Check if the package name is correct');
                actions.push('Verify the package is available in Pyodide');
                break;

            case 'initialization_error':
                actions.push('Reload the VS Code window');
                actions.push('Check your internet connection');
                actions.push('Verify the extension installation');
                break;

            case 'internal_error':
                actions.push('Try restarting the notebook kernel');
                actions.push('Check the VS Code output panel for detailed error information');
                actions.push('Report this issue if it persists');
                break;
        }

        return actions;
    }

    /**
     * Determines if an error is retryable
     */
    static isRetryable(errorInfo: ErrorInfo): boolean {
        switch (errorInfo.type) {
            case 'timeout_error':
            case 'import_error':
            case 'initialization_error':
                return true;
            case 'python_exception':
                // Only retry for certain Python exceptions
                return this.isRetryablePythonException(errorInfo);
            case 'internal_error':
                // Only retry for network-related errors
                return this.isNetworkError(errorInfo.originalError);
            default:
                return false;
        }
    }

    /**
     * Filters stack trace to remove irrelevant frames
     */
    private static filterStackTrace(stack?: string): string | undefined {
        if (!stack) {return undefined;}

        return stack
            .split('\n')
            .filter(line => !ERROR_CONFIG.STACK_TRACE_FILTERS.some(filter => line.includes(filter)))
            .join('\n');
    }

    /**
     * Extracts Python traceback information
     */
    private static extractPythonTraceback(error: any): any {
        try {
            // Try to extract structured traceback information
            if (error.type && error.message) {
                return {
                    type: error.type,
                    message: error.message,
                    // Additional traceback parsing could be added here
                };
            }
        } catch {
            // Fallback to basic error information
        }
        return null;
    }

    /**
     * Checks if error is a timeout error
     */
    private static isTimeoutError(error: any): boolean {
        const errorMessage = String(error.message || error).toLowerCase();
        return errorMessage.includes('timeout') || 
               errorMessage.includes('timed out') ||
               errorMessage.includes('time limit exceeded');
    }

    /**
     * Checks if error is an import error
     */
    private static isImportError(error: any): boolean {
        const errorMessage = String(error.message || error).toLowerCase();
        return errorMessage.includes('modulenotfounderror') ||
               errorMessage.includes('importerror') ||
               errorMessage.includes('no module named') ||
               errorMessage.includes('cannot import');
    }

    /**
     * Checks if error is an initialization error
     */
    private static isInitializationError(error: any): boolean {
        const errorMessage = String(error.message || error).toLowerCase();
        return errorMessage.includes('pyodide') ||
               errorMessage.includes('initialization') ||
               errorMessage.includes('failed to load');
    }

    /**
     * Extracts missing package names from import errors
     */
    private static extractMissingPackages(error: any): string[] {
        const errorMessage = String(error.message || error);
        const packages: string[] = [];

        // Pattern to match "No module named 'package_name'"
        const modulePattern = /no module named ['"](.*?)['"]/gi;
        let match;
        while ((match = modulePattern.exec(errorMessage)) !== null) {
            packages.push(match[1]);
        }

        // Pattern to match "cannot import name 'name' from 'package'"
        const importFromPattern = /cannot import name ['"].*?['"] from ['"](.*?)['"]/gi;
        while ((match = importFromPattern.exec(errorMessage)) !== null) {
            packages.push(match[1]);
        }

        return [...new Set(packages)]; // Remove duplicates
    }

    /**
     * Formats Python error messages for better readability
     */
    private static formatPythonError(errorInfo: ErrorInfo): string {
        let message = `Python Error: ${errorInfo.message}`;
        
        if (errorInfo.context?.pythonType) {
            message = `${errorInfo.context.pythonType}: ${errorInfo.message}`;
        }

        if (errorInfo.context?.traceback) {
            message += '\n\nPython traceback information is available in the error details.';
        }

        return message;
    }

    /**
     * Formats import error messages with helpful suggestions
     */
    private static formatImportError(errorInfo: ErrorInfo): string {
        let message = 'Import Error: ' + errorInfo.message;
        
        if (errorInfo.context?.missingPackages?.length > 0) {
            const packages = errorInfo.context.missingPackages.join(', ');
            message += `\n\nMissing packages: ${packages}`;
            message += '\n\nNote: Some packages may not be available in the Pyodide environment.';
        }

        return message;
    }

    /**
     * Checks if a Python exception is retryable
     */
    private static isRetryablePythonException(errorInfo: ErrorInfo): boolean {
        const retryablePythonErrors = [
            'ConnectionError',
            'TimeoutError',
            'NetworkError',
            'TemporaryError'
        ];

        return retryablePythonErrors.some(errorType => 
            errorInfo.message.includes(errorType) || 
            errorInfo.context?.pythonType === errorType
        );
    }

    /**
     * Checks if an error is network-related
     */
    private static isNetworkError(error: Error): boolean {
        const networkErrorPatterns = [
            'network',
            'connection',
            'fetch',
            'request',
            'timeout'
        ];

        const errorMessage = error.message.toLowerCase();
        return networkErrorPatterns.some(pattern => errorMessage.includes(pattern));
    }

    /**
     * Creates a detailed error report for debugging
     */
    static createDetailedErrorReport(errorInfo: ErrorInfo): string {
        const report = [
            `Error Type: ${errorInfo.type}`,
            `Message: ${errorInfo.message}`,
            `Timestamp: ${new Date().toISOString()}`,
            ''
        ];

        if (errorInfo.stack) {
            report.push('Stack Trace:', errorInfo.stack, '');
        }

        if (errorInfo.context && Object.keys(errorInfo.context).length > 0) {
            report.push('Additional Context:');
            for (const [key, value] of Object.entries(errorInfo.context)) {
                report.push(`  ${key}: ${JSON.stringify(value, null, 2)}`);
            }
            report.push('');
        }

        report.push('Recovery Suggestions:');
        const suggestions = this.suggestRecoveryActions(errorInfo);
        suggestions.forEach(suggestion => report.push(`  • ${suggestion}`));

        return report.join('\n');
    }
}