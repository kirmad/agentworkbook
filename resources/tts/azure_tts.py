#!/usr/bin/env python3
# /// script
# requires-python = ">=3.8"
# dependencies = [
#     "azure-cognitiveservices-speech",
#     "python-dotenv",
#     "audioplayer",
# ]
# ///
"""
Azure Speech Services Text-to-Speech Terminal Script

This script provides text-to-speech functionality via Azure Speech Services
that can be called from VS Code notebooks using terminal execution.

Dependencies are automatically handled by uv via PEP 723 script metadata.

Usage:
    uv run resources/tts/azure_tts.py "Hello world"
    uv run resources/tts/azure_tts.py "Message to speak" --voice en-US-AriaNeural
    uv run resources/tts/azure_tts.py "Long message" --region westus2 --format audio-48khz-192kbitrate-mono-mp3
"""

import os
import sys
import argparse
import subprocess
import tempfile
import platform
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def setup_environment():
    """Check and setup the environment for Azure Speech Services"""
    
    # Check for .env file
    env_file = project_root / '.env'
    if env_file.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
            print(f"[OK] Loaded environment from {env_file}")
        except ImportError:
            print("[WARNING] python-dotenv not installed, trying system environment...")
    
    # Check subscription key
    subscription_key = os.getenv('AZURE_SPEECH_KEY')
    region = os.getenv('AZURE_SPEECH_REGION', 'eastus')
    
    if not subscription_key:
        print("[ERROR] AZURE_SPEECH_KEY not found!")
        print("[INFO] Setup options:")
        print(f"   1. Create {env_file} with: AZURE_SPEECH_KEY=your_key")
        print("   2. Export: export AZURE_SPEECH_KEY=your_key")
        print("   3. Pass as argument: --subscription-key your_key")
        return None, None
    
    return subscription_key, region

def play_audio_file(filename):
    """Play audio file using cross-platform Python library"""
    try:
        # Try to use audioplayer first (cross-platform)
        try:
            from audioplayer import AudioPlayer
            player = AudioPlayer(filename)
            player.play(block=True)  # Block until playback is complete
            return
        except ImportError:
            print("[WARNING] audioplayer library not available, falling back to system commands")
        
        # Fallback to system-specific commands if audioplayer is not available
        system = platform.system().lower()
        
        if system == "darwin":  # macOS
            subprocess.run(["afplay", filename], check=True)
        elif system == "linux":
            # Try common Linux audio players in order
            for player in ["paplay", "aplay", "play"]:
                try:
                    subprocess.run([player, filename], check=True)
                    return
                except (FileNotFoundError, subprocess.CalledProcessError):
                    continue
            raise Exception("No compatible audio player found")
        elif system == "windows":
            # Try Windows Media Player as fallback
            try:
                # Use wmplayer.exe which is more reliable than start
                subprocess.run(["wmplayer.exe", filename], check=True)
            except (FileNotFoundError, subprocess.CalledProcessError):
                # Final fallback to start command
                subprocess.run(["start", "", filename], shell=True, check=True)
        else:
            print(f"[WARNING] Unsupported platform: {system}")
            print(f"[FILE] Audio saved to: {filename}")
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Audio playback failed: {e}")
        raise
    except FileNotFoundError as e:
        print(f"[ERROR] Audio player not found: {e}")
        raise
    except Exception as e:
        print(f"[ERROR] Audio playback error: {e}")
        raise

def install_dependencies():
    """Check if required dependencies are available"""
    try:
        import azure.cognitiveservices.speech as speechsdk
        print("[OK] Azure Speech SDK available")
        return True
    except ImportError as e:
        print(f"[ERROR] Failed to import Azure Speech SDK: {e}")
        
        # For non-uv environments, provide installation guidance
        print("[INFO] Dependencies not available. Install options:")
        print("   Option 1: pip install --user azure-cognitiveservices-speech python-dotenv")
        print("   Option 2: Use uv: uv run resources/tts/azure_tts.py 'your message'")
        print("   Option 3: Use virtual environment")
        return False

def talk_azure(message, subscription_key, region="eastus", voice="en-US-JennyNeural", audio_format="audio-24khz-160kbitrate-mono-mp3"):
    """Convert text to speech using Azure Speech Services"""
    
    try:
        import azure.cognitiveservices.speech as speechsdk
        
        print(f"[AUDIO] Speaking: '{message[:50]}{'...' if len(message) > 50 else ''}'")
        print(f"[REGION] Region: {region}")
        print(f"[VOICE] Voice: {voice}")
        print(f"[FORMAT] Format: {audio_format}")
        
        # Create speech configuration
        speech_config = speechsdk.SpeechConfig(subscription=subscription_key, region=region)
        speech_config.speech_synthesis_voice_name = voice
        
        # Configure audio format with cleaner mapping
        format_map = {
            '16khz': speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3,
            '48khz': speechsdk.SpeechSynthesisOutputFormat.Audio48Khz192KBitRateMonoMp3,
            '24khz': speechsdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3,
        }
        
        # Find matching format or default to 24khz
        output_format = next(
            (fmt for key, fmt in format_map.items() if key in audio_format),
            format_map['24khz']
        )
        
        speech_config.set_speech_synthesis_output_format(output_format)
        file_extension = '.mp3'
        
        # Create synthesizer and get audio data
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
        result = synthesizer.speak_text_async(message).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            print("[OK] Audio synthesis completed")
            
            # Get audio data
            audio_data = result.audio_data
            if not audio_data:
                print("[ERROR] No audio data received")
                return False
            
            print(f"[DATA] Audio data size: {len(audio_data)} bytes")
            
            # Save to temporary file and play it
            with tempfile.NamedTemporaryFile(suffix=file_extension, delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_filename = temp_file.name
            
            try:
                play_audio_file(temp_filename)
                print("[OK] Audio playback completed successfully")
                return True
            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_filename)
                except OSError:
                    pass
        else:
            print(f"[ERROR] Synthesis failed: {result.reason}")
            return False
        
    except Exception as e:
        print(f"[ERROR] Azure Speech error: {str(e)}")
        
        # Specific error guidance
        error_str = str(e).lower()
        if "unauthorized" in error_str or "subscription" in error_str:
            print("[INFO] Check your Azure subscription key and region")
        elif "voice" in error_str or "language" in error_str:
            print("[INFO] Voice may not be available in the specified region")
        elif "network" in error_str or "connection" in error_str:
            print("[INFO] Check internet connection and Azure service availability")
        else:
            print("[INFO] Check subscription key, region, and internet connection")
        
        return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Azure Speech Services Text-to-Speech')
    parser.add_argument('message', help='Text message to speak')
    parser.add_argument('--subscription-key', help='Azure Speech Services subscription key (overrides environment)')
    parser.add_argument('--region', default='eastus', help='Azure region (default: eastus)')
    parser.add_argument('--voice', default='en-US-JennyNeural', help='Voice name (default: en-US-JennyNeural)')
    parser.add_argument('--format', default='audio-24khz-160kbitrate-mono-mp3',
                       choices=['audio-16khz-128kbitrate-mono-mp3', 'audio-24khz-160kbitrate-mono-mp3', 'audio-48khz-192kbitrate-mono-mp3',
                               'riff-16khz-16bit-mono-pcm', 'riff-24khz-16bit-mono-pcm', 'riff-48khz-16bit-mono-pcm'],
                       help='Audio output format (default: audio-24khz-160kbitrate-mono-mp3)')
    parser.add_argument('--setup', action='store_true', help='Run setup and test')
    parser.add_argument('--install', action='store_true', help='Install dependencies')
    
    args = parser.parse_args()
    
    # Handle special commands
    if args.install:
        success = install_dependencies()
        sys.exit(0 if success else 1)
    
    if args.setup:
        print("[SETUP] Azure Speech Services Terminal Setup")
        print("=" * 40)
        
        # Install dependencies
        if not install_dependencies():
            sys.exit(1)
        
        # Check environment
        subscription_key, region = setup_environment()
        if not subscription_key:
            sys.exit(1)
        
        # Test with a simple message
        print("\n[TEST] Testing speech...")
        success = talk_azure("Azure Speech Services setup test successful", subscription_key, region)
        print(f"\n{'[OK] Setup complete!' if success else '[ERROR] Setup failed'}")
        sys.exit(0 if success else 1)
    
    # Validate message
    if not args.message.strip():
        print("[ERROR] Error: Empty message provided")
        sys.exit(1)
    
    # Install dependencies if needed
    if not install_dependencies():
        sys.exit(1)
    
    # Get subscription key and region
    subscription_key = args.subscription_key
    region = args.region
    
    if not subscription_key:
        env_subscription_key, env_region = setup_environment()
        if not env_subscription_key:
            sys.exit(1)
        subscription_key = env_subscription_key
        if not args.region or args.region == 'eastus':  # Use env region if default
            region = env_region
    
    # Speak the message
    success = talk_azure(args.message, subscription_key, region, args.voice, args.format)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()