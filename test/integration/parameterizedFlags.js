const { parseFlags, processPromptWithFlags } = require('./out/flag_processor.js');

console.log('=== Testing Parameterized Flag Functionality ===');

const workspaceRoot = '/Users/kirmadi/git/agentworkbook';

// Test cases
const testCases = [
    {
        name: 'Simple flag without parameters',
        prompt: 'Create a component --think'
    },
    {
        name: 'Parameterized flag with two parameters',
        prompt: 'Document the feature --docs(src/components/Button.tsx, Button Component)'
    },
    {
        name: 'Mixed flags - regular and parameterized',
        prompt: 'Build feature --think --docs(api/users.js, User API) --with-tests'
    },
    {
        name: 'Hierarchical parameterized flag',  
        prompt: 'Create component --cs:think --frontend:component(Button, form-component)'
    },
    {
        name: 'Multiple parameters test',
        prompt: 'Generate code --template(param0, param1, param2, param3, param4)'
    }
];

testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.name} ---`);
    console.log(`Prompt: "${testCase.prompt}"`);
    
    // Parse flags
    const flags = parseFlags(testCase.prompt);
    console.log('Parsed flags:');
    flags.forEach(flag => {
        console.log(`  - Name: ${flag.name}`);
        console.log(`    Path: [${flag.path.join(', ')}]`);
        console.log(`    Parameters: [${flag.parameters.join(', ')}]`);
        console.log(`    Full match: ${flag.fullMatch}`);
    });
    
    // Process prompt
    const processedPrompt = processPromptWithFlags(testCase.prompt, workspaceRoot);
    const originalLength = testCase.prompt.length;
    const processedLength = processedPrompt.length;
    
    console.log(`Length: ${originalLength} -> ${processedLength} (+${processedLength - originalLength})`);
    
    // Show processed content preview
    if (processedLength > originalLength) {
        const flagContent = processedPrompt.substring(originalLength);
        console.log('Added content preview:', flagContent.substring(0, 200) + (flagContent.length > 200 ? '...' : ''));
    }
});

// Test parameter edge cases
console.log('\n=== Testing Parameter Edge Cases ===');

const edgeCases = [
    '--docs()',  // Empty parameters
    '--docs(single)',  // Single parameter
    '--docs(  spaced  ,  params  )',  // Spaced parameters
    '--docs(param with spaces, another param)',  // Parameters with spaces
    '--complex:flag($$0, $$1, $$2)'  // Parameters that look like templates
];

edgeCases.forEach(edgeCase => {
    console.log(`\nEdge case: "${edgeCase}"`);
    const flags = parseFlags(`Test ${edgeCase}`);
    if (flags.length > 0) {
        const flag = flags[0];
        console.log(`  Parameters: [${flag.parameters.map(p => `"${p}"`).join(', ')}]`);
        console.log(`  Parameter count: ${flag.parameters.length}`);
    }
});

console.log('\n=== Template Substitution Test ===');
// Create a simple test for template substitution
const { loadFlagContent } = require('./out/flag_processor.js');

// Test the docs template we created
const testParams = ['docs/feature.md', 'Feature Component'];
const content = loadFlagContent(['docs'], testParams, workspaceRoot);
if (content) {
    console.log('Template substitution result:');
    console.log(content);
} else {
    console.log('Failed to load docs template');
}