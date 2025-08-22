#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "elevenlabs",
#     "python-dotenv",
# ]
# ///
"""
ElevenLabs Text-to-Speech Terminal Script

This script provides text-to-speech functionality via ElevenLabs API
that can be called from VS Code notebooks using terminal execution.

Usage:
    uv run resources/tts/elevenlabs.py "Hello world"
    uv run resources/tts/elevenlabs.py "Message to speak" --voice rachel
    uv run resources/tts/elevenlabs.py "Long message" --model turbo --format mp3_22050_32
"""

import os
import sys
import argparse
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def setup_environment():
    """Check and setup the environment for ElevenLabs"""
    
    # Check for .env file
    env_file = project_root / '.env'
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
            print(f"[OK] Loaded environment from {env_file}")
        except ImportError:
            print("[WARNING] python-dotenv not installed, trying system environment...")
    
    # Check API key
    api_key = os.getenv('ELEVENLABS_API_KEY')
    if not api_key:
        print("[ERROR] ELEVENLABS_API_KEY not found!")
        print("[INFO] Setup options:")
        print(f"   1. Create {env_file} with: ELEVENLABS_API_KEY=your_key")
        print("   2. Export: export ELEVENLABS_API_KEY=your_key")
        print("   3. Pass as argument: --api-key your_key")
        return None
    
    return api_key

def install_dependencies():
    """Check if required dependencies are available (uv handles installation)"""
    try:
        import elevenlabs
        print("[OK] ElevenLabs library available")
        return True
    except ImportError:
        print("[ERROR] ElevenLabs library not available")
        print("[TIP] When using uv run, dependencies should be automatically installed")
        print("[INFO] If you see this error, check the script dependencies or run:")
        print("   uv add elevenlabs python-dotenv")
        return False

def get_voice_id(voice_name):
    """Convert voice name to voice ID"""
    voice_map = {
        'rachel': 'JBFqnCBsd6RMkjVDRZzb',
        'adam': 'pNInz6obpgDQGcFmaJgB',
        'antoni': 'ErXwobaYiN019PkySvjV',
        'arnold': 'VR6AewLTigWG4xSOukaG',
        'bella': 'EXAVITQu4vr4xnSDxMaL',
        'domi': 'AZnzlk1XvdvUeBnXmlld',
        'elli': 'MF3mGyEYCl7XYWbV9V6O',
        'gigi': 'jBpfuIE2acCO8z3wKNLl',
        'giovanni': 'zcAOhNBS3c14rBihAFp1',
        'josh': 'TxGEqnHWrfWFTfGW9XjX',
        'matilda': 'XrExE9yKIg1WjnnlVkGX',
        'nicole': 'piTKgcLEGmPE4e6mEKli',
        'sam': 'yoZ06aMxZJJ28mfd3POQ',
    }
    return voice_map.get(voice_name.lower(), voice_name)

def talk(message, api_key, voice_id="JBFqnCBsd6RMkjVDRZzb", model_id="eleven_multilingual_v2", output_format="mp3_44100_128"):
    """Convert text to speech using ElevenLabs API"""
    
    try:
        from elevenlabs.client import ElevenLabs
        from elevenlabs import play
        
        print(f"[AUDIO] Speaking: '{message[:50]}{'...' if len(message) > 50 else ''}'")
        
        # Initialize client
        client = ElevenLabs(api_key=api_key)
        
        # Convert text to speech
        audio = client.text_to_speech.convert(
            text=message,
            voice_id=voice_id,
            model_id=model_id,
            output_format=output_format
        )
        
        # Play audio
        play(audio)
        
        print("[OK] Speech completed successfully")
        return True
        
    except Exception as e:
        print(f"[ERROR] Speech error: {str(e)}")
        
        # Provide specific error guidance
        error_str = str(e).lower()
        error_guidance = {
            ("unauthorized", "api_key"): "[INFO] Check your API key",
            ("voice",): "[INFO] Voice ID may not be available for your account", 
            ("network", "connection"): "[INFO] Check internet connection"
        }
        
        guidance = next(
            (msg for keywords, msg in error_guidance.items() if any(k in error_str for k in keywords)),
            "[INFO] Check API key, account status, and internet connection"
        )
        print(guidance)
        
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='ElevenLabs Text-to-Speech')
    parser.add_argument('message', help='Text message to speak')
    parser.add_argument('--api-key', help='ElevenLabs API key (overrides environment)')
    parser.add_argument('--voice', default='rachel', help='Voice name or ID (default: rachel)')
    parser.add_argument('--model', default='eleven_multilingual_v2', 
                       choices=['eleven_multilingual_v2', 'eleven_turbo_v2', 'eleven_flash_v2'],
                       help='Model to use (default: eleven_multilingual_v2)')
    parser.add_argument('--format', default='mp3_44100_128',
                       choices=['mp3_44100_128', 'mp3_22050_32', 'pcm_16000', 'pcm_22050', 'pcm_44100'],
                       help='Output format (default: mp3_44100_128)')
    parser.add_argument('--setup', action='store_true', help='Run setup and test')
    parser.add_argument('--install', action='store_true', help='Install dependencies')
    
    args = parser.parse_args()
    
    # Handle special commands
    if args.install:
        success = install_dependencies()
        sys.exit(0 if success else 1)
    
    if args.setup:
        print("[SETUP] ElevenLabs Terminal Setup")
        print("=" * 30)
        
        # Install dependencies
        if not install_dependencies():
            sys.exit(1)
        
        # Check environment
        api_key = setup_environment()
        if not api_key:
            sys.exit(1)
        
        # Test with a simple message
        print("\n[TEST] Testing speech...")
        success = talk("Setup test successful", api_key)
        print(f"\n{'[OK] Setup complete!' if success else '[ERROR] Setup failed'}")
        sys.exit(0 if success else 1)
    
    # Validate message
    if not args.message.strip():
        print("[ERROR] Error: Empty message provided")
        sys.exit(1)
    
    # Install dependencies if needed
    if not install_dependencies():
        sys.exit(1)
    
    # Get API key
    api_key = args.api_key or setup_environment()
    if not api_key:
        sys.exit(1)
    
    # Convert voice name to ID
    voice_id = get_voice_id(args.voice)
    
    # Speak the message
    success = talk(args.message, api_key, voice_id, args.model, args.format)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()