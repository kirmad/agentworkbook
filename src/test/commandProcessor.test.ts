import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { 
    parseCustomCommands, 
    loadCommandContent, 
    processPromptWithCommands,
    startsWithCommand,
    extractCommandName
} from '../utils/commandProcessor';

describe('CommandProcessor', function() {
    const testWorkspaceRoot = path.join(__dirname, '..', '..');
    
    describe('parseCustomCommands', function() {
        it('should parse simple commands', function() {
            const prompt = '/git status';
            const commands = parseCustomCommands(prompt);
            
            expect(commands).to.have.length(1);
            expect(commands[0].name).to.equal('git');
            expect(commands[0].path).to.deep.equal(['git']);
            expect(commands[0].arguments).to.equal('status');
        });

        it('should parse hierarchical commands', function() {
            const prompt = '/git:commit -m "test message"';
            const commands = parseCustomCommands(prompt);
            
            expect(commands).to.have.length(1);
            expect(commands[0].name).to.equal('git:commit');
            expect(commands[0].path).to.deep.equal(['git', 'commit']);
            expect(commands[0].arguments).to.equal('-m "test message"');
        });

        it('should parse commands at start of line', function() {
            const prompt = '/sc:implement user authentication system --type feature';
            const commands = parseCustomCommands(prompt);
            
            expect(commands).to.have.length(1);
            expect(commands[0].name).to.equal('sc:implement');
            expect(commands[0].arguments).to.equal('user authentication system --type feature');
        });

        it('should parse multiple commands', function() {
            const prompt = '/git status\n/git:commit -m "fix bug"';
            const commands = parseCustomCommands(prompt);
            
            expect(commands).to.have.length(2);
            expect(commands[0].name).to.equal('git');
            expect(commands[1].name).to.equal('git:commit');
        });

        it('should handle commands without arguments', function() {
            const prompt = '/git:status';
            const commands = parseCustomCommands(prompt);
            
            expect(commands).to.have.length(1);
            expect(commands[0].name).to.equal('git:status');
            expect(commands[0].arguments).to.equal('');
        });
    });

    describe('loadCommandContent', function() {
        it('should load existing command content with $ARGUMENTS replacement', async function() {
            const content = await loadCommandContent(['sc:implement'], 'user auth --type feature', testWorkspaceRoot);
            
            if (content) {
                expect(content.content).to.include('user auth --type feature');
                expect(content.frontMatter).to.exist;
                expect(content.frontMatter?.description).to.include('Implement features');
            }
        });

        it('should return null for non-existent commands', async function() {
            const content = await loadCommandContent(['nonexistent'], '', testWorkspaceRoot);
            expect(content).to.be.null;
        });
    });

    describe('startsWithCommand', function() {
        it('should detect lines that start with commands', function() {
            expect(startsWithCommand('/git status')).to.be.true;
            expect(startsWithCommand('/sc:implement feature')).to.be.true;
            expect(startsWithCommand('  /git status')).to.be.true; // with leading whitespace
            expect(startsWithCommand('not a command /git')).to.be.false;
            expect(startsWithCommand('regular text')).to.be.false;
        });
    });

    describe('extractCommandName', function() {
        it('should extract command names correctly', function() {
            expect(extractCommandName('/git status')).to.equal('git');
            expect(extractCommandName('/sc:implement feature')).to.equal('sc:implement');
            expect(extractCommandName('  /git:commit -m "test"')).to.equal('git:commit');
            expect(extractCommandName('not a command')).to.be.null;
        });
    });

    describe('processPromptWithCommands', function() {
        it('should process commands and replace $ARGUMENTS', async function() {
            const prompt = '/sc:implement user authentication system --type feature';
            const processed = await processPromptWithCommands(prompt, testWorkspaceRoot);
            
            // Should contain the arguments we passed
            expect(processed).to.include('user authentication system --type feature');
            // Should contain content from the command file
            expect(processed).to.include('Feature Implementation');
        });

        it('should handle commands with bash execution disabled', async function() {
            const prompt = '/sc:implement test feature';
            const processed = await processPromptWithCommands(prompt, testWorkspaceRoot);
            
            // Should not try to execute any shell commands for sc:implement
            expect(processed).to.not.include('Error:');
        });
    });
});