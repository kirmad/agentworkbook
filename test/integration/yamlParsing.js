// Simple test to verify YAML parsing works
const fs = require('fs');
const yaml = require('js-yaml');

try {
    // Read the test YAML file
    const content = fs.readFileSync('.agentworkbook/scripts/basic-task.awbscript', 'utf8');
    console.log('Raw YAML content:');
    console.log(content);
    console.log('\n--- Parsing YAML ---\n');
    
    // Parse YAML
    const templateData = yaml.load(content);
    console.log('Parsed YAML object:');
    console.log(JSON.stringify(templateData, null, 2));
    
    // Test the template structure
    console.log('\n--- Template Properties ---');
    console.log('Name:', templateData.name);
    console.log('Description:', templateData.description);
    console.log('Language:', templateData.language);
    console.log('Code length:', templateData.code.length, 'characters');
    
    console.log('\n✅ YAML parsing test PASSED!');
} catch (error) {
    console.error('❌ YAML parsing test FAILED:', error.message);
}