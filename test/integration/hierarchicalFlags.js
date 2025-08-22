const { parseFlags, processPromptWithFlags } = require('./out/flag_processor.js');

// Test hierarchical flag parsing
console.log('=== Testing Hierarchical Flag Parsing ===');

// Test cases
const testPrompts = [
    'Create a component --think',
    'Build an API --cs:think --iterative',
    'Design a system --frontend:component --backend:api',
    'Mixed flags --think --cs:think --with-tests'
];

const workspaceRoot = '/Users/kirmadi/git/agentworkbook';

testPrompts.forEach((prompt, index) => {
    console.log(`\nTest ${index + 1}: "${prompt}"`);
    
    // Parse flags
    const flags = parseFlags(prompt);
    console.log('Parsed flags:', flags.map(f => ({ name: f.name, path: f.path })));
    
    // Process prompt
    const processedPrompt = processPromptWithFlags(prompt, workspaceRoot);
    console.log('Processed prompt length:', processedPrompt.length);
    console.log('Processed prompt preview:', processedPrompt.substring(0, 200) + '...');
});

// Test specific hierarchical flag parsing
console.log('\n=== Testing Specific Hierarchical Cases ===');

const hierarchicalTests = [
    '--think',  // Base level flag
    '--cs:think',  // Two-level hierarchy
    '--frontend:component',  // Two-level hierarchy
    '--backend:api:rest',  // Three-level hierarchy (theoretical)
    '--deep:nested:hierarchy:flag'  // Four-level hierarchy
];

hierarchicalTests.forEach(flagTest => {
    console.log(`\nTesting: "${flagTest}"`);
    const flags = parseFlags(`Test prompt ${flagTest}`);
    if (flags.length > 0) {
        console.log('Flag name:', flags[0].name);
        console.log('Flag path:', flags[0].path);
        console.log('Path length:', flags[0].path.length);
        
        if (flags[0].path.length === 1) {
            console.log('Expected file path: .agentworkbook/flags/' + flags[0].path[0] + '.md');
        } else {
            console.log('Expected file path: .agentworkbook/flags/' + flags[0].path.slice(0, -1).join('/') + '/' + flags[0].path[flags[0].path.length - 1] + '.md');
        }
        
        // Test actual content loading
        const processedPrompt = processPromptWithFlags(`Test prompt ${flagTest}`, workspaceRoot);
        console.log('Content loaded:', processedPrompt.includes('--- Flag:'));
        if (processedPrompt.includes('--- Flag:')) {
            console.log('Content preview:', processedPrompt.split('--- Flag:')[1].substring(0, 100) + '...');
        }
    }
});

// Test mixed flag usage
console.log('\n=== Testing Mixed Flag Usage ===');
const mixedPrompt = 'Create a component --think --cs:think --frontend:component --deep:nested:hierarchy:flag';
console.log(`Testing mixed prompt: "${mixedPrompt}"`);
const processedMixed = processPromptWithFlags(mixedPrompt, workspaceRoot);
console.log('Original length:', mixedPrompt.length);
console.log('Processed length:', processedMixed.length);
console.log('Number of flags found:', (processedMixed.match(/--- Flag:/g) || []).length);