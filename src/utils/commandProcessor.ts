import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { CommandDiscoveryService, DiscoveredCommand, CommandFrontMatter } from './commandDiscovery';
import { shellCommandProcessor } from './shellCommandProcessor';

/**
 * Represents a parsed custom command from a prompt
 */
export interface ParsedCommand {
    name: string;
    fullMatch: string;
    path: string[];  // For hierarchical commands like git:commit -> ['git', 'commit']
    arguments: string; // Everything after the command name
    startIndex: number; // Position where the command starts in the prompt
    endIndex: number; // Position where the command ends in the prompt
}

/**
 * Represents processed command content with metadata
 */
interface ProcessedCommandContent {
    content: string;
    frontMatter?: CommandFrontMatter;
    shouldPersist: boolean;
    shouldExecuteBash: boolean;
}

/**
 * Parses custom commands from a prompt string
 * Commands must start with / and be followed by alphanumeric characters, hyphens, underscores, or colons
 * Supports hierarchical commands like /git:commit
 */
export function parseCustomCommands(prompt: string): ParsedCommand[] {
    // Match commands at the start of the line: /commandname followed by optional arguments
    // This regex ensures the command is at the start of the line or after whitespace
    const commandRegex = /(?:^|\s)(\/([a-zA-Z0-9_:-]+)(?:\s+(.*))?)/gm;
    const commands: ParsedCommand[] = [];
    
    let match;
    while ((match = commandRegex.exec(prompt)) !== null) {
        const fullMatch = match[1]; // The entire match including /
        const commandName = match[2]; // The command name without /
        const argumentsString = match[3] || ''; // Arguments (if any)
        const startIndex = match.index + (match[0].length - fullMatch.length); // Adjust for potential leading whitespace
        const endIndex = startIndex + fullMatch.length;
        
        // Parse hierarchical structure from colon-separated path
        const pathParts = commandName.split(':');
        
        commands.push({
            name: commandName,
            fullMatch: fullMatch,
            path: pathParts,
            arguments: argumentsString.trim(),
            startIndex,
            endIndex
        });
    }
    
    return commands;
}

/**
 * Process $ARGUMENTS replacement in command content
 */
function processArgumentsReplacement(content: string, args: string): string {
    // Replace $ARGUMENTS with the provided arguments
    let processedContent = content.replace(/\$ARGUMENTS/g, args);
    
    // If there was no $ARGUMENTS placeholder and we have arguments, append them
    if (!content.includes('$ARGUMENTS') && args.trim()) {
        processedContent = content.trim() + '\n\n' + args;
    }
    
    return processedContent;
}

/**
 * Load command content from the .agentworkbook/commands/ directory
 */
export async function loadCommandContent(commandPath: string[], args: string = '', workspaceRoot?: string): Promise<ProcessedCommandContent | null> {
    const commandDiscoveryService = CommandDiscoveryService.getInstance();
    const commandName = commandPath.join(':');
    
    // Try to get the command from the discovery service
    const discoveredCommand = await commandDiscoveryService.getCommand(commandName);
    if (!discoveredCommand) {
        return null;
    }
    
    const { content, frontMatter } = discoveredCommand;
    
    // Process $ARGUMENTS replacement
    let processedContent = processArgumentsReplacement(content, args);
    
    // Determine behavior from front-matter
    const shouldPersist = frontMatter?.['persist-command'] !== false; // Default to true
    const shouldExecuteBash = frontMatter?.['bash-execution'] === true; // Default to false
    
    return {
        content: processedContent,
        frontMatter,
        shouldPersist,
        shouldExecuteBash
    };
}

/**
 * Process a prompt by extracting custom commands and applying their content
 * Commands can replace themselves, be appended, or prepended based on configuration
 */
export async function processPromptWithCommands(prompt: string, workspaceRoot?: string): Promise<string> {
    const commands = parseCustomCommands(prompt);
    
    if (commands.length === 0) {
        return prompt;
    }
    
    let processedPrompt = prompt;
    const beforeContents: string[] = [];
    const afterContents: string[] = [];
    const replacements: Array<{ startIndex: number; endIndex: number; content: string }> = [];
    
    // Process commands in reverse order to handle index adjustments correctly
    for (const command of commands.reverse()) {
        const commandData = await loadCommandContent(command.path, command.arguments, workspaceRoot);
        if (!commandData) {
            continue;
        }
        
        const { content, frontMatter, shouldPersist, shouldExecuteBash } = commandData;
        
        // Process bash commands if enabled
        let finalContent = content;
        if (shouldExecuteBash) {
            try {
                finalContent = await shellCommandProcessor.processContent(content);
            } catch (error) {
                console.error(`Error executing bash commands in ${command.name}:`, error);
                // Continue with original content if bash execution fails
            }
        }
        
        // Format the command content
        const formattedContent = finalContent.trim();
        
        if (shouldPersist) {
            // Keep the command in the prompt and add content after
            afterContents.unshift(`\n${formattedContent}`);
        } else {
            // Replace the command with its content
            replacements.push({
                startIndex: command.startIndex,
                endIndex: command.endIndex,
                content: formattedContent
            });
        }
    }
    
    // Apply replacements (in reverse order to maintain indices)
    for (const replacement of replacements.sort((a, b) => b.startIndex - a.startIndex)) {
        processedPrompt = processedPrompt.substring(0, replacement.startIndex) + 
                         replacement.content + 
                         processedPrompt.substring(replacement.endIndex);
    }
    
    // Clean up any extra whitespace
    processedPrompt = processedPrompt.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    // Combine everything: before + prompt + after
    const parts = [
        beforeContents.join('\n'),
        processedPrompt,
        afterContents.join('\n')
    ].filter(part => part.trim().length > 0);
    
    return parts.join('\n\n');
}

/**
 * Check if a line starts with a custom command
 */
export function startsWithCommand(line: string): boolean {
    const trimmed = line.trim();
    return /^\/[a-zA-Z0-9_:-]+/.test(trimmed);
}

/**
 * Extract command name from a line that starts with a command
 */
export function extractCommandName(line: string): string | null {
    const match = line.trim().match(/^\/([a-zA-Z0-9_:-]+)/);
    return match ? match[1] : null;
}

/**
 * Get command suggestions for a partial command input
 */
export async function getCommandSuggestions(partialInput: string): Promise<DiscoveredCommand[]> {
    const commandDiscoveryService = CommandDiscoveryService.getInstance();
    
    // Remove the leading / if present
    const cleanInput = partialInput.replace(/^\//, '');
    
    return await commandDiscoveryService.getMatchingCommands(cleanInput);
}

/**
 * Validate that a command exists
 */
export async function validateCommand(commandName: string): Promise<boolean> {
    const commandDiscoveryService = CommandDiscoveryService.getInstance();
    const command = await commandDiscoveryService.getCommand(commandName);
    return command !== null;
}

/**
 * Process multiple prompts with commands
 */
export async function processPromptsWithCommands(prompts: string[], workspaceRoot?: string): Promise<string[]> {
    const processedPrompts: string[] = [];
    
    for (const prompt of prompts) {
        const processedPrompt = await processPromptWithCommands(prompt, workspaceRoot);
        processedPrompts.push(processedPrompt);
    }
    
    return processedPrompts;
}

/**
 * Process prompts with both commands and flags
 */
export async function processPromptsWithCommandsAndFlags(prompts: string[], workspaceRoot?: string): Promise<string[]> {
    // First process commands
    const commandProcessedPrompts = await processPromptsWithCommands(prompts, workspaceRoot);
    
    // Then process flags
    const { processPromptsWithFlags } = await import('./flagProcessor');
    return processPromptsWithFlags(commandProcessedPrompts, workspaceRoot);
}

/**
 * Process prompts with commands, flags, and shell commands
 */
export async function processPromptsWithAll(prompts: string[], workspaceRoot?: string): Promise<string[]> {
    // First process commands (which may include bash execution)
    const commandProcessedPrompts = await processPromptsWithCommands(prompts, workspaceRoot);
    
    // Then process flags and shell commands
    const { processPromptsWithFlagsAndShellCommands } = await import('./flagProcessor');
    return processPromptsWithFlagsAndShellCommands(commandProcessedPrompts, workspaceRoot);
}