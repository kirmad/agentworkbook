// Verify all converted YAML templates can be parsed correctly
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

console.log('🔍 Verifying converted .awbscript YAML files (with hierarchical support)...\n');

const templateFiles = [
    '.agentworkbook/scripts/basic-task.awbscript',
    '.agentworkbook/scripts/shell-command.awbscript', 
    '.agentworkbook/scripts/async-example.awbscript',
    // Example hierarchical templates (these would be created by users)
    '.agentworkbook/scripts/python/data-analysis.awbscript',
    '.agentworkbook/scripts/testing/unit-test.awbscript'
];

let allPassed = true;

templateFiles.forEach((filePath, index) => {
    console.log(`${index + 1}. Testing: ${filePath}`);
    
    try {
        // Check if file exists (some might be example hierarchical templates)
        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  File does not exist (example hierarchical template)`);
            console.log('');
            return;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const templateData = yaml.load(content);
        
        // Validate required fields
        const required = ['name', 'language', 'code'];
        const missing = required.filter(field => !templateData[field]);
        
        if (missing.length > 0) {
            console.log(`   ❌ Missing required fields: ${missing.join(', ')}`);
            allPassed = false;
        } else {
            console.log(`   ✅ Template "${templateData.name}" - OK`);
            console.log(`      Description: ${templateData.description || 'None'}`);
            console.log(`      Language: ${templateData.language}`);
            console.log(`      Code length: ${templateData.code.length} characters`);
            console.log(`      Path level: ${filePath.split('/').length - 3} (hierarchical support)`);
        }
    } catch (error) {
        console.log(`   ❌ Parse error: ${error.message}`);
        allPassed = false;
    }
    
    console.log('');
});

console.log(allPassed ? '🎉 All templates verified successfully!' : '❌ Some templates have issues');
process.exit(allPassed ? 0 : 1);