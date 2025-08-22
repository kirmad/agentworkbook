# AgentWorkbook Installation Guide

Get AgentWorkbook running in VS Code in under 5 minutes.

## Prerequisites

- **VS Code**: Version 1.88.0 or higher
- **Node.js**: Version 16.0.0 or higher (for development features)
- **RooCode Extension**: Required dependency

## Installation Steps

### 1. Install from VS Code Marketplace

**Method A: Extensions View**
1. Open VS Code
2. Click Extensions icon in sidebar (`Ctrl+Shift+X`)
3. Search for "AgentWorkbook"
4. Click **Install** on "AgentWorkbook - AI Task Manager & Notebook" by KiranMadipally

**Method B: Command Palette**
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type `ext install KiranMadipally.agentworkbook`
3. Press Enter to install

### 2. Install Required Dependencies

**Install RooCode Extension:**
1. In Extensions view, search for "roo-cline" 
2. Install "Roo Code" by rooveterinaryinc
3. Or use Command Palette: `ext install rooveterinaryinc.roo-cline`

### 3. Verify Installation

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type "AgentWorkbook"
3. You should see commands like:
   - "AgentWorkbook: New notebook"
   - "AgentWorkbook: Install Resources"

### 4. Create Your First Notebook

1. Command Palette → "AgentWorkbook: New notebook"
2. A new `.agentworkbook` file opens
3. Start coding and creating AI tasks!

## Optional Setup

### Text-to-Speech (Optional)

**For ElevenLabs TTS:**
1. Go to VS Code Settings (`Ctrl+,`)
2. Search "agentworkbook"
3. Set `agentworkbook.tts.provider` to "elevenlabs"
4. Add your ElevenLabs API key to `agentworkbook.tts.elevenlabs.apiKey`

**For Azure TTS:**
1. Set `agentworkbook.tts.provider` to "azure"  
2. Add Azure subscription key and region

### Resource Installation

Run these commands to install additional resources:
- `AgentWorkbook: Install Resources` - Install all flags, scripts, and templates
- `AgentWorkbook: Install Flags` - Install flag system
- `AgentWorkbook: Install Scripts` - Install code templates
- `AgentWorkbook: Install Templates` - Install notebook templates

## Troubleshooting

### Extension Not Activating
- Ensure VS Code version ≥ 1.88.0
- Check that RooCode extension is installed and enabled
- Restart VS Code after installation

### Python Execution Issues
- Pyodide downloads automatically on first use
- Check browser console (F12) for WebAssembly errors
- Try: `AgentWorkbook: Clear Shell Command Cache`

### Task Queue Not Visible
- Open an `.agentworkbook` file
- Check VS Code status bar for AgentWorkbook indicator
- Ensure RooCode extension is active

## Next Steps

- 📖 Read the [README](README.md) for comprehensive usage guide
- 🎯 Try the [Quick Start](README.md#-quick-start) examples
- 🔧 Explore [Advanced Features](README.md#advanced-features)
- 🐛 Report issues on [GitHub](https://github.com/kirmad/agentworkbook/issues)

---

**Need Help?** Check the [GitHub Issues](https://github.com/kirmad/agentworkbook/issues) or create a new issue for support.