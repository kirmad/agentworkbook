import * as assert from 'assert';
import * as vscode from 'vscode';
import { FilePathCompletionProvider } from '../utils/filePathCompletionProvider';

suite('FilePathCompletionProvider', () => {
    let provider: FilePathCompletionProvider;

    setup(() => {
        provider = new FilePathCompletionProvider();
    });

    suite('getFilePathContext', () => {
        test('should detect @ trigger', () => {
            // Use reflection to access private method for testing
            const method = (provider as any).getFilePathContext.bind(provider);
            
            const result = method('@');
            assert.strictEqual(result?.partial, '');
            assert.strictEqual(result?.startPos, 0);
        });

        test('should detect partial file path', () => {
            const method = (provider as any).getFilePathContext.bind(provider);
            
            const result = method('some text @src/comp');
            assert.strictEqual(result?.partial, 'src/comp');
            assert.strictEqual(result?.startPos, 10);
        });

        test('should detect full file path', () => {
            const method = (provider as any).getFilePathContext.bind(provider);
            
            const result = method('@src/components/Button.tsx');
            assert.strictEqual(result?.partial, 'src/components/Button.tsx');
            assert.strictEqual(result?.startPos, 0);
        });

        test('should return null for no @ trigger', () => {
            const method = (provider as any).getFilePathContext.bind(provider);
            
            const result = method('some text without trigger');
            assert.strictEqual(result, null);
        });

        test('should return null for @ in middle of word', () => {
            const method = (provider as any).getFilePathContext.bind(provider);
            
            const result = method('email@domain.com');
            assert.strictEqual(result, null);
        });
    });

    suite('calculateRelevanceScore', () => {
        test('should score exact matches highest', () => {
            const method = (provider as any).calculateRelevanceScore.bind(provider);
            
            const exactScore = method('test.ts', 'test.ts');
            const partialScore = method('src/test.ts', 'test.ts');
            
            assert.ok(exactScore > partialScore);
        });

        test('should prefer shorter paths', () => {
            const method = (provider as any).calculateRelevanceScore.bind(provider);
            
            const shortPath = method('test.ts', 'test');
            const longPath = method('src/components/test.ts', 'test');
            
            assert.ok(shortPath > longPath);
        });

        test('should prefer filename matches over path matches', () => {
            const method = (provider as any).calculateRelevanceScore.bind(provider);
            
            const filenameMatch = method('other/button.ts', 'button');
            const pathMatch = method('button/other.ts', 'button');
            
            assert.ok(filenameMatch > pathMatch);
        });
    });

    suite('getFileTypeDescription', () => {
        test('should return correct descriptions for common file types', () => {
            const method = (provider as any).getFileTypeDescription.bind(provider);
            
            assert.strictEqual(method('test.ts'), 'TypeScript');
            assert.strictEqual(method('component.tsx'), 'TypeScript React');
            assert.strictEqual(method('script.js'), 'JavaScript');
            assert.strictEqual(method('README.md'), 'Markdown');
            assert.strictEqual(method('config.json'), 'JSON');
        });

        test('should return empty string for unknown file types', () => {
            const method = (provider as any).getFileTypeDescription.bind(provider);
            
            assert.strictEqual(method('unknown.xyz'), '');
        });
    });

    suite('prioritizeFilesForInitialDisplay', () => {
        test('should include files from entire hierarchy', () => {
            const method = (provider as any).prioritizeFilesForInitialDisplay.bind(provider);
            
            const files = [
                'README.md',
                'src/component.ts',
                'src/utils/helper.ts',
                'dist/main.js',
                'package.json'
            ];
            
            const prioritized = method(files);
            
            // Should include files from different levels, not just top-level
            assert.ok(prioritized.some(f => f.includes('src/')), 'Should include files from src directory');
            assert.ok(prioritized.includes('README.md'), 'Should include top-level files');
            assert.ok(prioritized.includes('package.json'), 'Should include important root files');
        });

        test('should prioritize important root files', () => {
            const method = (provider as any).prioritizeFilesForInitialDisplay.bind(provider);
            
            const files = [
                'some/deep/file.ts',
                'README.md',
                'package.json',
                'random.txt'
            ];
            
            const prioritized = method(files);
            
            // Important files should appear early in the list
            const readmeIndex = prioritized.indexOf('README.md');
            const packageIndex = prioritized.indexOf('package.json');
            const randomIndex = prioritized.indexOf('random.txt');
            
            assert.ok(readmeIndex < randomIndex, 'README.md should have higher priority than random.txt');
            assert.ok(packageIndex < randomIndex, 'package.json should have higher priority than random.txt');
        });

        test('should include directories for navigation', () => {
            const method = (provider as any).prioritizeFilesForInitialDisplay.bind(provider);
            
            const files = [
                'src/component.ts',
                'lib/utils.ts',
                'test/spec.ts'
            ];
            
            const prioritized = method(files);
            
            // Should include directories for navigation
            assert.ok(prioritized.includes('src/'), 'Should include src/ directory');
            assert.ok(prioritized.includes('lib/'), 'Should include lib/ directory');
            assert.ok(prioritized.includes('test/'), 'Should include test/ directory');
        });
    });

    suite('calculateInitialDisplayScore', () => {
        test('should score important root files highest', () => {
            const method = (provider as any).calculateInitialDisplayScore.bind(provider);
            
            const readmeScore = method('README.md');
            const packageScore = method('package.json');
            const randomScore = method('random.txt');
            
            assert.ok(readmeScore > randomScore, 'README.md should score higher than random.txt');
            assert.ok(packageScore > randomScore, 'package.json should score higher than random.txt');
        });

        test('should prefer shallower paths', () => {
            const method = (provider as any).calculateInitialDisplayScore.bind(provider);
            
            const shallowScore = method('component.ts');
            const deepScore = method('src/deep/nested/component.ts');
            
            assert.ok(shallowScore > deepScore, 'Shallower paths should score higher');
        });

        test('should give bonus to source files', () => {
            const method = (provider as any).calculateInitialDisplayScore.bind(provider);
            
            const tsScore = method('component.ts');
            const txtScore = method('component.txt');
            
            assert.ok(tsScore > txtScore, 'TypeScript files should score higher than text files');
        });

        test('should prioritize directories for navigation', () => {
            const method = (provider as any).calculateInitialDisplayScore.bind(provider);
            
            const dirScore = method('src/');
            const fileScore = method('src/component.ts');
            
            assert.ok(dirScore > fileScore, 'Directories should score higher for navigation');
        });
    });

    suite('createFilePathCompletionItem', () => {
        test('should create completion item for file', () => {
            const method = (provider as any).createFilePathCompletionItem.bind(provider);
            
            const context = { partial: 'src', startPos: 5 };
            const workspaceRoot = '/workspace';
            const item = method('src/component.ts', context, workspaceRoot);
            
            assert.strictEqual(item.insertText, 'src/component.ts');
            assert.strictEqual(item.kind, vscode.CompletionItemKind.File);
            assert.ok(item.label.label === 'src/component.ts');
        });

        test('should create completion item for directory', () => {
            const method = (provider as any).createFilePathCompletionItem.bind(provider);
            
            const context = { partial: '', startPos: 0 };
            const workspaceRoot = '/workspace';
            const item = method('src/', context, workspaceRoot);
            
            assert.strictEqual(item.insertText, 'src/');
            assert.strictEqual(item.kind, vscode.CompletionItemKind.Folder);
            assert.ok(item.label.label === 'src/');
        });
    });
});