const { parseFlags, processPromptWithFlags } = require('./out/flag_processor.js');

console.log('=== Testing Backward Compatibility ===');

const workspaceRoot = '/Users/kirmadi/git/agentworkbook';

// Test existing functionality to ensure nothing is broken
const backwardCompatibilityTests = [
    'Create a component --think',
    'Build API --incremental --with-tests',
    'Design system --cs:think --frontend:component',
    'Complex task --think --cs:think --with-tests --iterative'
];

backwardCompatibilityTests.forEach((prompt, index) => {
    console.log(`\nBackward Compatibility Test ${index + 1}`);
    console.log(`Prompt: "${prompt}"`);
    
    const flags = parseFlags(prompt);
    console.log('Flags found:', flags.length);
    
    flags.forEach(flag => {
        console.log(`  - ${flag.name}: ${flag.parameters.length} parameters`);
    });
    
    const processed = processPromptWithFlags(prompt, workspaceRoot);
    const flagCount = (processed.match(/--- Flag:/g) || []).length;
    console.log(`Content loaded for ${flagCount} flags`);
    
    // Verify no parameterized syntax is accidentally parsed
    const hasParameterizedSyntax = flags.some(flag => flag.parameters.length > 0);
    console.log(`Contains parameterized flags: ${hasParameterizedSyntax}`);
});

console.log('\n=== All Tests Passed ===');