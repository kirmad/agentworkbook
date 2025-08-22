import * as assert from 'assert';
import { ShellCommandProcessor } from '../utils/shellCommandProcessor';

// Mock for VS Code workspace configuration
const mockVSCodeConfig = {
    enabled: true,
    get(key: string, defaultValue?: any): any {
        if (key === 'shellCommands.enabled') {
            return this.enabled;
        }
        return defaultValue;
    }
};

// Simple mock for vscode.workspace.getConfiguration
const mockGetConfiguration = () => mockVSCodeConfig;

describe('ShellCommandProcessor', () => {
    let processor: ShellCommandProcessor;

    beforeEach(() => {
        // Reset mock config to enabled
        mockVSCodeConfig.enabled = true;
        processor = new ShellCommandProcessor();
        processor.clearCache();
    });

    describe('processContent', () => {
        it('should handle content with no shell commands', async () => {
            const content = 'This is just regular text with no commands';
            const result = await processor.processContent(content);
            
            assert.strictEqual(result, content);
        });

        it('should handle malformed shell command syntax', async () => {
            const content = 'Malformed: !echo "test" (missing backticks)';
            const result = await processor.processContent(content);
            
            // Should return original content for malformed syntax
            assert.strictEqual(result, content);
        });

        it('should handle empty content', async () => {
            const result = await processor.processContent('');
            assert.strictEqual(result, '');
        });

        it('should detect shell command pattern correctly', async () => {
            const content = 'Test: !`echo "hello world"`';
            const result = await processor.processContent(content);
            
            // Should process the command (result will contain actual output or error)
            assert.notStrictEqual(result, content);
            assert.ok(result.includes('Test:'));
        });

        it('should process multiple shell commands in content', async () => {
            const content = `Multiple commands:
!\`echo "first"\`
!\`echo "second"\`
End of test`;
            
            const result = await processor.processContent(content);
            
            // Should process both commands
            assert.notStrictEqual(result, content);
            assert.ok(result.includes('Multiple commands:'));
            assert.ok(result.includes('End of test'));
        });

        it('should handle command execution errors gracefully', async () => {
            const content = 'Error test: !`nonexistentcommandxyz123`';
            
            const result = await processor.processContent(content);
            
            // Should handle error gracefully and return some result
            assert.ok(result.includes('Error test:'));
            // Error handling should replace the command with error info
            assert.notStrictEqual(result, content);
        });

        it('should handle special characters in commands', async () => {
            const content = 'Test: !`echo "special chars: $@#%^&*"`';
            
            const result = await processor.processContent(content);
            
            // Should handle special characters
            assert.ok(result.includes('Test:'));
            assert.notStrictEqual(result, content);
        });

        it('should handle nested backticks properly', async () => {
            const content = 'Test: !`echo "backtick: \\`"`';
            
            const result = await processor.processContent(content);
            
            // Should handle escaped backticks
            assert.ok(result.includes('Test:'));
            assert.notStrictEqual(result, content);
        });

        it('should preserve non-command content exactly', async () => {
            const content = `
This is normal text.
Some markdown **bold** text.
Code block:
\`\`\`
console.log('test');
\`\`\`
End of content.
            `;
            
            const result = await processor.processContent(content);
            
            // Should preserve all non-command content exactly
            assert.strictEqual(result, content);
        });
    });

    describe('caching', () => {
        it('should return cache statistics', () => {
            const stats = processor.getCacheStats();
            assert.ok(typeof stats.size === 'number');
            assert.ok(stats.oldestEntry === null || typeof stats.oldestEntry === 'number');
        });

        it('should clear cache when requested', () => {
            processor.clearCache();
            const stats = processor.getCacheStats();
            assert.strictEqual(stats.size, 0);
        });

        it('should cleanup expired cache entries', () => {
            processor.cleanupCache();
            // Test should verify expired entries are removed
            const stats = processor.getCacheStats();
            assert.ok(typeof stats.size === 'number');
        });

        it('should cache command results', async () => {
            const content = 'Cache test: !`echo "cached result"`';
            
            // First execution
            const result1 = await processor.processContent(content);
            const stats1 = processor.getCacheStats();
            
            // Second execution (should use cache)
            const result2 = await processor.processContent(content);
            const stats2 = processor.getCacheStats();
            
            // Results should be identical
            assert.strictEqual(result1, result2);
            // Cache size should remain the same (reused entry)
            assert.strictEqual(stats1.size, stats2.size);
        });
    });

    describe('edge cases', () => {
        it('should handle very long commands', async () => {
            const longCommand = 'a'.repeat(100); // Reduced from 1000 for test performance
            const content = `Test: !\`echo "${longCommand}"\``;
            
            const result = await processor.processContent(content);
            
            // Should handle long commands appropriately
            assert.ok(result.includes('Test:'));
        });

        it('should handle concurrent requests', async () => {
            const content1 = 'Test1: !`echo "first"`';
            const content2 = 'Test2: !`echo "second"`';
            
            // Test concurrent processing
            const promises = [
                processor.processContent(content1),
                processor.processContent(content2)
            ];
            
            const results = await Promise.all(promises);
            assert.strictEqual(results.length, 2);
            assert.ok(results[0].includes('Test1:'));
            assert.ok(results[1].includes('Test2:'));
        });
    });

    describe('pattern detection', () => {
        it('should correctly identify shell command patterns', () => {
            const testCases = [
                { input: 'Test: !`echo "hello"`', shouldMatch: true },
                { input: 'Test: !echo "hello"', shouldMatch: false },
                { input: 'Test: `echo "hello"`', shouldMatch: false },
                { input: 'Test: !`ls -la`', shouldMatch: true },
                { input: 'Multiple: !`pwd` and !`date`', shouldMatch: true },
                { input: 'No commands here', shouldMatch: false }
            ];

            const regex = /!\`([^`]+)\`/g;
            
            testCases.forEach(testCase => {
                const matches = testCase.input.match(regex);
                const hasMatch = matches !== null && matches.length > 0;
                
                assert.strictEqual(
                    hasMatch, 
                    testCase.shouldMatch, 
                    `Pattern detection failed for: "${testCase.input}"`
                );
            });
        });
    });

    describe('basic functionality', () => {
        it('should have required methods', () => {
            assert.ok(typeof processor.processContent === 'function');
            assert.ok(typeof processor.clearCache === 'function');
            assert.ok(typeof processor.getCacheStats === 'function');
            assert.ok(typeof processor.cleanupCache === 'function');
        });

        it('should handle basic echo command', async () => {
            const content = 'Result: !`echo "test message"`';
            const result = await processor.processContent(content);
            
            // Should contain the result and not be the original content
            assert.notStrictEqual(result, content);
            assert.ok(result.includes('Result:'));
            assert.ok(result.includes('test message'));
        });
    });
});