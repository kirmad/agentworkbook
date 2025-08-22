import * as path from 'path';
import * as fs from 'fs';

import * as vscode from 'vscode';
import { FlagFrontMatter } from './flagDiscovery';

/**
 * Represents a parsed flag from a prompt
 */
interface ParsedFlag {
    name: string;
    fullMatch: string;
    path: string[];  // For hierarchical flags like cs:think -> ['cs', 'think']
    parameters: string[];  // For parameterized flags like --docs(param1, param2)
}

/**
 * Represents loaded flag content with front-matter metadata
 */
interface LoadedFlagContent {
    content: string;
    frontMatter?: FlagFrontMatter;
}

/**
 * Parses flags from a prompt string
 * Flags must start with -- and be followed by alphanumeric characters, hyphens, underscores, or colons
 * Supports parameterized flags with optional parameters in parentheses
 */
export function parseFlags(prompt: string): ParsedFlag[] {
    // Match flags: --flagname or --flagname(param1, param2)
    const flagRegex = /--([a-zA-Z0-9_:-]+)(?:\(([^)]+)\))?/g;
    const flags: ParsedFlag[] = [];
    const seenFlags = new Set<string>();
    
    let match;
    while ((match = flagRegex.exec(prompt)) !== null) {
        const flagName = match[1];
        const paramString = match[2]; // Parameters string (if any)
        
        if (!seenFlags.has(flagName)) {
            // Parse hierarchical structure from colon-separated path
            const pathParts = flagName.split(':');
            
            // Parse parameters if they exist
            let parameters: string[] = [];
            if (paramString) {
                parameters = paramString
                    .split(',')
                    .map(param => param.trim())
                    .filter(param => param.length > 0);
            }
            
            flags.push({
                name: flagName,
                fullMatch: match[0],
                path: pathParts,
                parameters: parameters
            });
            seenFlags.add(flagName);
        }
    }
    
    return flags;
}

/**
 * Processes template substitution for flag content
 * Replaces $$0 through $$9 with provided parameters
 */
function processTemplateSubstitution(content: string, parameters: string[]): string {
    let processedContent = content;
    
    // Replace $$0 through $$9 with corresponding parameters
    for (let i = 0; i < 10; i++) {
        const placeholder = `$$${i}`;
        const replacement = parameters[i] || '';  // Use empty string if parameter not provided
        
        // Use global replacement to handle multiple occurrences
        processedContent = processedContent.replace(new RegExp('\\$\\$' + i, 'g'), replacement);
    }
    
    return processedContent;
}

/**
 * Parse front-matter from flag content
 */
function parseFrontMatter(content: string): { frontMatter?: FlagFrontMatter; content: string } {
    // Check for YAML front-matter (starts with ---)
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    
    if (!match) {
        // No front-matter found, return the original content
        return { content };
    }
    
    const [, yamlContent, remainingContent] = match;
    
    try {
        // Parse the YAML front-matter
        const frontMatter = parseSimpleYaml(yamlContent);
        return { frontMatter, content: remainingContent };
    } catch (yamlError) {
        console.error(`Error parsing YAML front-matter:`, yamlError);
        return { content };
    }
}

/**
 * Simple YAML parser for front-matter (limited to our needs)
 */
function parseSimpleYaml(yamlContent: string): FlagFrontMatter {
    const frontMatter: FlagFrontMatter = {};
    const lines = yamlContent.trim().split('\n');
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue; // Skip empty lines and comments
        }
        
        const colonIndex = trimmedLine.indexOf(':');
        if (colonIndex === -1) {
            continue; // Skip malformed lines
        }
        
        const key = trimmedLine.substring(0, colonIndex).trim();
        let value = trimmedLine.substring(colonIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        // Parse based on key
        switch (key) {
            case 'description':
            case 'signature':
                frontMatter[key] = value;
                break;
            case 'placement':
                if (['before', 'after', 'replace'].includes(value)) {
                    frontMatter.placement = value as 'before' | 'after' | 'replace';
                }
                break;
            case 'persist_flag':
            case 'allow_multiple':
                frontMatter[key] = value.toLowerCase() === 'true';
                break;
        }
    }
    
    return frontMatter;
}

/**
 * Loads flag content from the .agentworkbook/flags/ directory, supporting both flat and hierarchical paths
 * For hierarchical flags like --cs:think, looks for .agentworkbook/flags/cs/think.md
 * For flat flags like --think, looks for .agentworkbook/flags/think.md
 * Supports parameterized flags with $$0-$$9 template substitution
 * Now returns both content and front-matter metadata
 */
export function loadFlagContent(flagPath: string[], parameters: string[] = [], workspaceRoot?: string): LoadedFlagContent | null {
    if (!workspaceRoot) {
        // Try to get workspace root from VS Code if available
        if (vscode.workspace.workspaceFolders?.length > 0) {
            workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        
        if (!workspaceRoot) {
            return null;
        }
    }
    
    // Helper function to process flag file content
    const processFileContent = (filePath: string): LoadedFlagContent | null => {
        try {
            if (fs.existsSync(filePath)) {
                const rawContent = fs.readFileSync(filePath, 'utf8');
                
                // Parse front-matter from the content
                const { frontMatter, content } = parseFrontMatter(rawContent.trim());
                
                // Process template substitution if parameters are provided
                let processedContent = content;
                if (parameters.length > 0) {
                    processedContent = processTemplateSubstitution(content, parameters);
                }
                
                return {
                    content: processedContent,
                    frontMatter
                };
            }
        } catch (error) {
            console.error(`Error reading flag file ${filePath}:`, error);
        }
        return null;
    };

    // For single-part flags (flat structure), look in base flags directory
    if (flagPath.length === 1) {
        const flagFilePath = path.join(workspaceRoot, '.agentworkbook', 'flags', `${flagPath[0]}.md`);
        return processFileContent(flagFilePath);
    } else {
        // For multi-part flags (hierarchical structure), build nested path
        // Example: --cs:think -> .agentworkbook/flags/cs/think.md
        const flagFilePath = path.join(workspaceRoot, '.agentworkbook', 'flags', ...flagPath.slice(0, -1), `${flagPath[flagPath.length - 1]}.md`);
        return processFileContent(flagFilePath);
    }
    
    return null;
}

/**
 * Processes a prompt by extracting flags and applying their content based on front-matter configuration
 * Supports before/after/replace placement, flag persistence, and multiple flag handling
 */
export function processPromptWithFlags(prompt: string, workspaceRoot?: string): string {
    const flags = parseFlags(prompt);
    
    if (flags.length === 0) {
        return prompt;
    }
    
    let processedPrompt = prompt;
    const beforeContents: string[] = [];
    const afterContents: string[] = [];
    const processedFlags = new Set<string>();
    
    for (const flag of flags) {
        const flagData = loadFlagContent(flag.path, flag.parameters, workspaceRoot);
        if (!flagData) {
            continue;
        }
        
        const { content, frontMatter } = flagData;
        const placement = frontMatter?.placement || 'after'; // Default to 'after'
        const persistFlag = frontMatter?.persist_flag !== false; // Default to true
        const allowMultiple = frontMatter?.allow_multiple !== false; // Default to true
        
        // Check if we should skip this flag due to multiple handling rules
        if (!allowMultiple && processedFlags.has(flag.name)) {
            continue;
        }
        processedFlags.add(flag.name);
        
        // Format the flag content
        const paramInfo = flag.parameters.length > 0 ? ` (${flag.parameters.join(', ')})` : '';
        const formattedContent = `\n\n--- Flag: --${flag.name}${paramInfo} ---\n${content}`;
        
        // Handle placement
        switch (placement) {
            case 'before':
                beforeContents.push(formattedContent);
                break;
            case 'after':
                afterContents.push(formattedContent);
                break;
            case 'replace':
                // Replace the flag occurrence with its content
                processedPrompt = processedPrompt.replace(flag.fullMatch, content);
                break;
        }
        
        // Remove the flag from the prompt if persist_flag is false (and not 'replace' which already removes it)
        if (!persistFlag && placement !== 'replace') {
            processedPrompt = processedPrompt.replace(flag.fullMatch, '');
        }
    }
    
    // Clean up any double spaces that might have been created by flag removal
    processedPrompt = processedPrompt.replace(/\s+/g, ' ').trim();
    
    // Combine everything: before + prompt + after
    const parts = [
        beforeContents.join('\r\n\r\n'),
        processedPrompt,
        afterContents.join('\r\n\r\n')
    ].filter(part => part.length > 0);
    
    return parts.join('\r\n\r\n');
}

/**
 * Legacy function for backward compatibility - simple flag processing that appends content
 */
export function processPromptWithFlagsLegacy(prompt: string, workspaceRoot?: string): string {
    const flags = parseFlags(prompt);
    
    if (flags.length === 0) {
        return prompt;
    }
    
    const flagContents: string[] = [];
    
    for (const flag of flags) {
        const flagData = loadFlagContent(flag.path, flag.parameters, workspaceRoot);
        if (flagData) {
            const paramInfo = flag.parameters.length > 0 ? ` (${flag.parameters.join(', ')})` : '';
            flagContents.push(`\n\n--- Flag: --${flag.name}${paramInfo} ---\n${flagData.content}`);
        }
    }
    
    if (flagContents.length === 0) {
        return prompt;
    }
    
    return prompt + flagContents.join('');
}

/**
 * Processes multiple prompts with flags
 */
export function processPromptsWithFlags(prompts: string[], workspaceRoot?: string): string[] {
    const processedPrompts: string[] = [];
    
    for (const prompt of prompts) {
        const processedPrompt = processPromptWithFlags(prompt, workspaceRoot);
        processedPrompts.push(processedPrompt);
    }
    
    return processedPrompts;
}

/**
 * Processes prompts with both flags and shell commands
 */
export async function processPromptsWithFlagsAndShellCommands(prompts: string[], workspaceRoot?: string): Promise<string[]> {
    // First process flags
    const flagProcessedPrompts = processPromptsWithFlags(prompts, workspaceRoot);
    
    // Then process shell commands
    const { shellCommandProcessor } = await import('./shellCommandProcessor');
    const processedPrompts: string[] = [];
    
    for (const prompt of flagProcessedPrompts) {
        const processedPrompt = await shellCommandProcessor.processContent(prompt);
        processedPrompts.push(processedPrompt);
    }
    
    return processedPrompts;
}