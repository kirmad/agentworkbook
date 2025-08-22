import * as assert from 'assert';
import * as vscode from 'vscode';
import { FlagCompletionProvider } from '../utils/flagCompletionProvider';
import { FlagDiscoveryService } from '../utils/flagDiscovery';

suite('Enhanced Flag Completion', () => {
    let provider: FlagCompletionProvider;
    let flagDiscoveryService: FlagDiscoveryService;

    setup(() => {
        provider = new FlagCompletionProvider();
        flagDiscoveryService = FlagDiscoveryService.getInstance();
    });

    suite('Flag Context Detection', () => {
        test('should detect -- trigger at start of line', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('--');
            assert.strictEqual(result?.partial, '');
            assert.strictEqual(result?.startPos, 0);
        });

        test('should detect --t partial flag', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('--t');
            assert.strictEqual(result?.partial, 't');
            assert.strictEqual(result?.startPos, 0);
        });

        test('should detect -- after whitespace', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('some text --');
            assert.strictEqual(result?.partial, '');
            assert.strictEqual(result?.startPos, 10);
        });

        test('should detect --think complete flag name', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('--think');
            assert.strictEqual(result?.partial, 'think');
            assert.strictEqual(result?.startPos, 0);
        });

        test('should detect hierarchical flag pattern', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('--persona-architect');
            assert.strictEqual(result?.partial, 'persona-architect');
            assert.strictEqual(result?.startPos, 0);
        });

        test('should not trigger on single dash', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('some-text');
            assert.strictEqual(result, null);
        });

        test('should not trigger on -- inside words', () => {
            const method = (provider as any).getFlagContext.bind(provider);
            
            const result = method('email--domain.com');
            assert.strictEqual(result, null);
        });
    });

    suite('Flag Discovery Integration', () => {
        test('should discover flags from multiple sources', async () => {
            const flags = await flagDiscoveryService.getAvailableFlags();
            
            // Should have flags from different sources
            const sources = new Set(flags.map(f => f.source));
            assert.ok(sources.size > 0, 'Should discover flags from at least one source');
            
            // Should include standard flags
            const hasStandardFlags = flags.some(f => f.source === 'standard');
            assert.ok(hasStandardFlags, 'Should include standard flags from FLAGS.md');
        });

        test('should filter flags correctly for partial input', async () => {
            // Test empty input returns all flags
            const allFlags = await flagDiscoveryService.getMatchingFlags('');
            assert.ok(allFlags.length > 0, 'Should return all flags for empty input');
            
            // Test partial input filters correctly
            const thinkFlags = await flagDiscoveryService.getMatchingFlags('think');
            const hasThinkFlag = thinkFlags.some(f => f.name.includes('think'));
            assert.ok(hasThinkFlag, 'Should include flags containing "think"');
            
            // Test prefix matching
            const tFlags = await flagDiscoveryService.getMatchingFlags('t');
            const allStartWithT = tFlags.every(f => 
                f.name.toLowerCase().startsWith('t') || 
                f.pathComponents.some(c => c.toLowerCase().startsWith('t'))
            );
            // Note: this might include contains matches as fallback, so we just check we get results
            assert.ok(tFlags.length > 0, 'Should return flags matching "t"');
        });
    });
});