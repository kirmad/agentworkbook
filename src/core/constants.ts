/**
 * Application constants and default values
 */

/**
 * Minimum required version of RooCode extension
 */
export const MIN_ROO_CODE_VERSION = '3.11.9';

/**
 * Extension identifiers
 */
export const EXTENSION_IDS = {
    ROO_CLINE: 'rooveterinaryinc.roo-cline',
    ROO_CODE: 'rooveterinaryinc.roo-code' // Alternative name reference
} as const;

/**
 * VS Code commands
 */
export const COMMANDS = {
    NEW_NOTEBOOK: 'agentworkbook.newNotebook',
    INSERT_TEMPLATE: 'agentworkbook.insertTemplate',
    SHOW_ROO_CODE_SIDEBAR: 'workbench.view.extension.roo-cline-ActivityBar',
    INSTALL_RESOURCES: 'agentworkbook.installResources',
    INSTALL_FLAGS: 'agentworkbook.installFlags',
    INSTALL_SCRIPTS: 'agentworkbook.installScripts',
    INSTALL_TEMPLATES: 'agentworkbook.installTemplates',
    INSTALL_ROOCODE_RESOURCES: 'agentworkbook.installRooCodeResources',
    INSTALL_ROOCODE_MODES: 'agentworkbook.installRooCodeModes',
    INSTALL_ROOCODE_COMMANDS: 'agentworkbook.installRooCodeCommands',
    INSTALL_ROOCODE_RULES: 'agentworkbook.installRooCodeRules',
    TOGGLE_SHELL_COMMANDS: 'agentworkbook.toggleShellCommands',
    CLEAR_SHELL_COMMAND_CACHE: 'agentworkbook.clearShellCommandCache',
    CREATE_FLAG: 'agentworkbook.createFlag'
} as const;

/**
 * Default timeouts (in milliseconds)
 */
export const TIMEOUTS = {
    TELEMETRY_INIT: 5000,
    SHELL_COMMAND: 300_000
} as const;

/**
 * UI repaint schedule timeouts (in milliseconds)
 */
export const UI_REPAINT_TIMEOUTS = [100, 400, 1000] as const;