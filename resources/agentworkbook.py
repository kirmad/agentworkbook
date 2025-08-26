import _agentworkbook as api  # type: ignore

# Note: This code runs inside Pyodide (WebAssembly Python), where platform.system() 
# doesn't correctly detect the host OS. Instead, we use api.getPlatform() which 
# returns the actual VS Code host platform ('win32' for Windows, 'darwin' for macOS, 'linux' for Linux).

import functools
import inspect
import pyodide
import time
from typing import Any, Callable, Coroutine, Dict, Optional, TypeVar, Union, cast, TYPE_CHECKING

T = TypeVar('T')
def track_api_call(func: Callable[..., T]) -> Callable[..., T]:
    """
    Decorator that tracks API calls to PostHog.
    It emits three types of events:
    - python_api:{func_name}:call - When the function is called
    - python_api:{func_name}:success - When the function completes successfully
    - python_api:{func_name}:exception - When the function raises an exception
    """
    func_name = func.__qualname__

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> T:
        def metrics_for_arg(name: str, value: Any, metrics: Dict[str, Any]):
            metrics[f"arg:{name}:type"] = type(value).__name__
            if isinstance(value, (str, list, tuple, dict)):
                metrics[f"arg:{name}:length"] = len(value)
            if isinstance(value, (bool, int, float)):
                metrics[f"arg:{name}:value"] = value

        # Prepare arguments for analytics
        # Get the parameter names from the function signature
        sig = inspect.signature(func)
        metrics = {}
        try:
            bound_args = sig.bind(*args, **kwargs)
            for key, value in bound_args.arguments.items():
                metrics_for_arg(key, value, metrics)
        except:
            pass

        # Emit call event
        api.emitPosthogEvent(f"python_api:{func_name}:call", metrics)
        
        start_time = time.time()
        try:
            # Call the original function
            result = func(*args, **kwargs)
            
            # Emit success event
            duration_ms = int((time.time() - start_time) * 1000)
            api.emitPosthogEvent(f"python_api:{func_name}:success", {
                "duration": duration_ms,
            })
            
            return result
        except:
            # Emit exception event
            duration_ms = int((time.time() - start_time) * 1000)
            api.emitPosthogEvent(f"python_api:{func_name}:exception", {
                "duration": duration_ms,
            })
            
            # Re-raise the exception
            raise
    
    return cast(Callable[..., T], wrapper)

class Task:
    def __init__(self, task):
        self._task = task

    @property
    @track_api_call
    def id(self):
        return self._task.id

    @property
    @track_api_call
    def status(self):
        return self._task.status

    @property
    @track_api_call
    def prompt(self):
        return self._task.prompt
    
    @property
    @track_api_call
    def mode(self):
        return self._task.mode

    @property
    @track_api_call
    def client(self):
        return self._task.client

    @track_api_call
    def __repr__(self):
        return f"Task(id={repr(self.id)}, prompt={repr(self.prompt)}, client={repr(self.client)}, status={repr(self.status)})"

    @track_api_call
    def submit(self):
        self._task.submit()

    @track_api_call
    def cancel(self):
        self._task.cancel()

    @track_api_call
    def archive(self):
        self._task.archive()

    @track_api_call
    def unarchive(self):
        self._task.unarchive()


def _create_hook_proxy(hook: Optional[str] | Callable[[Task], Optional[str]]):
    return pyodide.ffi.create_proxy((lambda task: hook) if hook is None or isinstance(hook, str) else (lambda task: hook(Task(task))))

def _clone_hook_proxy(hook: Optional[pyodide.ffi.JsDoubleProxy]) -> Optional[pyodide.ffi.JsDoubleProxy]:
    return None if hook is None else pyodide.ffi.create_proxy(hook.unwrap())


class Hooks:
    @track_api_call
    def __init__(self, hooks):
        self._hooks = hooks

    @track_api_call
    def override(self, onstart = None, oncomplete = None, onpause = None, onresume = None):
        def make_hook(hook, default):
            if hook is None:
                return _clone_hook_proxy(default)
            else:
                return _create_hook_proxy(hook)

        onstart = make_hook(onstart, self._hooks.onstart)
        oncomplete = make_hook(oncomplete, self._hooks.oncomplete)
        onpause = make_hook(onpause, self._hooks.onpause)
        onresume = make_hook(onresume, self._hooks.onresume)

        return Hooks(api.createHooks(onstart, oncomplete, onpause, onresume))

@track_api_call
def working_directory(path: str):
    api.workingDirectory = path

@track_api_call
def onstart(hook: Optional[str] | Callable[[Task], Optional[str]]):
    if api.globalHooks.onstart is not None:
        api.globalHooks.onstart.destroy()
    api.globalHooks.onstart = _create_hook_proxy(hook)

@track_api_call
def oncomplete(hook: Optional[str] | Callable[[Task], Optional[str]]):
    if api.globalHooks.oncomplete is not None:
        api.globalHooks.oncomplete.destroy()
    api.globalHooks.oncomplete = _create_hook_proxy(hook)

@track_api_call
def onpause(hook: Optional[str] | Callable[[Task], Optional[str]]):
    if api.globalHooks.onpause is not None:
        api.globalHooks.onpause.destroy()
    api.globalHooks.onpause = _create_hook_proxy(hook)

@track_api_call
def onresume(hook: Optional[str] | Callable[[Task], Optional[str]]):
    if api.globalHooks.onresume is not None:
        api.globalHooks.onresume.destroy()
    api.globalHooks.onresume = _create_hook_proxy(hook)

@track_api_call
def current_hooks() -> Hooks:
    return Hooks(api.globalHooks)

@track_api_call
def live_preview():
    return api.livePreview()

@track_api_call
async def build_prompt(prompt: str, workspace_root: Optional[str] = None) -> str:
    """
    Build a prompt by processing both commands and flags without creating tasks.
    
    Args:
        prompt: The raw prompt string containing commands and flags
        workspace_root: Optional workspace root path for command and flag discovery
    
    Returns:
        The processed prompt string with commands and flags applied
    """
    return await api.buildPrompt(prompt, workspace_root)

@track_api_call
async def build_prompts(prompts: list[str], workspace_root: Optional[str] = None) -> list[str]:
    """
    Build multiple prompts by processing both commands and flags without creating tasks.
    
    Args:
        prompts: List of raw prompt strings containing commands and flags
        workspace_root: Optional workspace root path for command and flag discovery
    
    Returns:
        List of processed prompt strings with commands and flags applied
    """
    return await api.buildPrompts(prompts, workspace_root)

@track_api_call
def create_task(prompt: str, mode: str = 'code', hooks: Optional[Hooks] = None, client: str = 'roo', supercode_url: Optional[str] = None, build_prompt: bool = True) -> Task:
    """
    Create a single task from a prompt.
    
    Args:
        prompt: Prompt string (can be raw or pre-processed)
        mode: Task mode ('code' or other modes)
        hooks: Optional hooks for task lifecycle
        client: Client type ('roo', 'copilot', 'supercode')
        supercode_url: Optional SuperCode URL
        build_prompt: Whether to build prompt by processing flags (True for backward compatibility, False for pre-processed prompts)
    
    Returns:
        Created Task object
    """
    tasks = create_tasks([prompt], mode, hooks, client, supercode_url, build_prompt)
    return tasks[0]

@track_api_call
def create_tasks(prompts: list[str], mode: str = 'code', hooks: Optional[Hooks] = None, client: str = 'roo', supercode_url: Optional[str] = None, build_prompt: bool = True) -> list[Task]:
    """
    Create tasks from prompts.
    
    Args:
        prompts: List of prompt strings (can be raw or pre-processed)
        mode: Task mode ('code' or other modes)
        hooks: Optional hooks for task lifecycle
        client: Client type ('roo', 'copilot', 'supercode')
        supercode_url: Optional SuperCode URL
        build_prompt: Whether to build prompts by processing flags (True for backward compatibility, False for pre-processed prompts)
    
    Returns:
        List of created Task objects
    """
    hooks = None if hooks is None else hooks._hooks
    tasks = api.createTasks(prompts, mode, hooks, client, supercode_url, build_prompt)
    return [Task(task) for task in tasks]

@track_api_call
def submit_task(prompt: str, mode: str = 'code', hooks: Optional[Hooks] = None, client: str = 'roo', supercode_url: Optional[str] = None, build_prompt: bool = True) -> Task:
    """
    Create and submit a single task from a prompt.
    
    Args:
        prompt: Prompt string (can be raw or pre-processed)
        mode: Task mode ('code' or other modes)
        hooks: Optional hooks for task lifecycle
        client: Client type ('roo', 'copilot', 'supercode')
        supercode_url: Optional SuperCode URL
        build_prompt: Whether to build prompt by processing flags (True for backward compatibility, False for pre-processed prompts)
    
    Returns:
        Submitted Task object
    """
    tasks = submit_tasks([prompt], mode, hooks, client, supercode_url, build_prompt)
    return tasks[0]

@track_api_call
def submit_tasks(prompts: list[str], mode: str = 'code', hooks: Optional[Hooks] = None, client: str = 'roo', supercode_url: Optional[str] = None, build_prompt: bool = True) -> list[Task]:
    """
    Create and submit tasks from prompts.
    
    Args:
        prompts: List of prompt strings (can be raw or pre-processed)
        mode: Task mode ('code' or other modes)
        hooks: Optional hooks for task lifecycle
        client: Client type ('roo', 'copilot', 'supercode')
        supercode_url: Optional SuperCode URL
        build_prompt: Whether to build prompts by processing flags (True for backward compatibility, False for pre-processed prompts)
    
    Returns:
        List of submitted Task objects
    """
    tasks = create_tasks(prompts, mode, hooks, client, supercode_url, build_prompt)
    for task in tasks:
        task.submit()
    return tasks

@track_api_call
def pause_task_flow():
    api.pauseWorker()

@track_api_call
def resume_task_flow():
    api.resumeWorker()

@track_api_call
def execute_shell(command: str) -> Coroutine[None, None, Any]:
    return api.executeShell(command)

@track_api_call
def get_extension_path() -> str:
    """Get the VS Code extension directory path."""
    return api.getExtensionPath()

@track_api_call
def get_configuration(key: str) -> Any:
    """Get VS Code extension configuration value."""
    return api.getConfiguration(key)

@track_api_call
def develop():
    api.develop()
    return api.livePreview()

@track_api_call
async def wait_for_tasks(
    tasks: list[Union[Task, str]] = None,
    timeout: float = None,
    poll_interval: float = 0.1
) -> dict[str, str]:
    """
    Wait for tasks to complete without blocking the UI.
    
    Args:
        tasks: List of Task objects or task IDs. If None, waits for all active tasks.
        timeout: Maximum seconds to wait. None means wait indefinitely.
        poll_interval: Seconds between status checks (default: 0.1)
    
    Returns:
        Dictionary mapping task IDs to their final status.
    """
    import asyncio
    
    start_time = time.time()
    
    # Normalize input to task IDs
    if tasks is None:
        # Get all active tasks
        task_ids = []
        for task in api.queued_tasks():
            task_ids.append(task.id)
        for task in api.prepared_tasks():
            task_ids.append(task.id)
        running = api.running_task()
        if running:
            task_ids.append(running.id)
    else:
        # Convert Task objects to IDs
        task_ids = []
        for t in tasks:
            if isinstance(t, Task):
                task_ids.append(t.id)
            elif isinstance(t, str):
                task_ids.append(t)
            else:
                raise TypeError(f"Expected Task or str, got {type(t)}")
    
    results = {}
    remaining_ids = set(task_ids)
    
    while remaining_ids:
        # Check timeout
        if timeout is not None:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                # Mark remaining tasks as timeout
                for tid in remaining_ids:
                    results[tid] = 'timeout'
                break
        
        # Check each remaining task
        completed_ids = set()
        for tid in remaining_ids:
            task = _find_task_by_id(tid)
            
            if task is None:
                results[tid] = 'not_found'
                completed_ids.add(tid)
            elif task.status in ['completed', 'aborted', 'error']:
                results[tid] = task.status
                completed_ids.add(tid)
        
        # Remove completed tasks
        remaining_ids -= completed_ids
        
        # Sleep to avoid blocking UI
        if remaining_ids:
            await asyncio.sleep(poll_interval)
    
    return results

@track_api_call
def _find_task_by_id(task_id: str) -> Task:
    """Internal helper to find a task by ID."""
    # Check all task lists
    for task in api.queued_tasks():
        if task.id == task_id:
            return Task(task)
    
    for task in api.prepared_tasks():
        if task.id == task_id:
            return Task(task)
    
    for task in api.completed_tasks():
        if task.id == task_id:
            return Task(task)
    
    running = api.running_task()
    if running and running.id == task_id:
        return Task(running)
    
    return None

# Prompt variable support has been completely removed

@track_api_call
async def execute_prompt(prompt: str, mode: str = 'code', wait: bool = True) -> Task:
    """
    Convenience function to create, submit, and optionally wait for a task.
    
    Args:
        prompt: The prompt text
        mode: RooCode execution mode
        wait: Whether to wait for completion
    
    Returns:
        The Task object
    """
    tasks = create_tasks([prompt], mode)
    task = tasks[0]
    task.submit()
    
    if wait:
        results = await wait_for_tasks([task])
        return task if results[task.id] == 'completed' else task
    
    return task

@track_api_call
async def execute_vscode_command(command: str, *args: Any) -> Any:
    """
    Execute a VS Code command with optional arguments.
    
    This function provides a generic interface to execute any VS Code command
    programmatically from within the notebook environment.
    
    Args:
        command: The VS Code command ID (e.g., 'workbench.action.chat.open')
        *args: Arguments to pass to the command
    
    Returns:
        The result of the command execution, if any
        
    Raises:
        Exception: If the VS Code command fails to execute
    
    Examples:
        # Open command palette
        await awb.execute_vscode_command('workbench.action.showCommands')
        
        # Open a file
        await awb.execute_vscode_command('vscode.open', 'file:///path/to/file.py')
        
        # Execute with multiple arguments
        await awb.execute_vscode_command('workbench.action.chat.open', 'your prompt here')
    """
    return await api.executeVSCodeCommand(command, *args)

@track_api_call
async def send_to_copilot(prompt: str) -> Any:
    """
    Send a prompt to VS Code GitHub Copilot chat window.
    
    This is a convenience function that opens the Copilot chat interface
    with a pre-filled prompt, allowing you to interact with GitHub Copilot
    directly from your notebook.
    
    Args:
        prompt: The prompt text to send to Copilot. This should be a clear,
               specific request for code generation, explanation, or assistance.
    
    Returns:
        The result of opening the chat with the prompt
        
    Raises:
        Exception: If the Copilot chat cannot be opened or if Copilot is not available
    
    Examples:
        # Basic code generation
        await awb.send_to_copilot("write two sum with test cases in javascript")
        
        # Complex request
        await awb.send_to_copilot('''
        Create a React component that:
        1. Displays a list of todos
        2. Allows adding new todos  
        3. Uses TypeScript and proper typing
        ''')
        
        # Code explanation
        await awb.send_to_copilot("explain how async/await works in Python")
    """
    return await execute_vscode_command('workbench.action.chat.open', prompt)

# TTS Configuration and Provider Classes
class _TTSError(Exception):
    """Exception raised for TTS-related errors."""
    pass

class _TTSProvider:
    """Base class for TTS providers."""
    
    def __init__(self, provider_name: str, config_data: dict):
        self.name = provider_name
        self.config = config_data
    
    def get_config_value(self, key: str):
        """Get configuration value for this provider."""
        config_key = self.config['config_keys'].get(key)
        return get_configuration(config_key) if config_key else None
    
    def build_command(self, message: str, **kwargs) -> list:
        """Build the command to execute TTS. Must be implemented by subclasses."""
        raise NotImplementedError
    
    def validate_config(self) -> tuple[bool, str]:
        """Validate provider configuration. Returns (is_valid, error_message)."""
        raise NotImplementedError

class _ElevenLabsProvider(_TTSProvider):
    """ElevenLabs TTS provider."""
    
    def __init__(self):
        config_data = {
            'script': 'tts/elevenlabs.py',
            'default_voice': 'rachel',
            'default_model': 'eleven_multilingual_v2',
            'config_keys': {
                'api_key': 'tts.elevenlabs.apiKey',
                'voice': 'tts.elevenlabs.voice',
                'model': 'tts.elevenlabs.model'
            }
        }
        super().__init__('elevenlabs', config_data)
    
    def validate_config(self) -> tuple[bool, str]:
        """Validate ElevenLabs configuration."""
        api_key = self.get_config_value('api_key')
        if not api_key:
            return False, "ElevenLabs API key not configured"
        return True, ""
    
    def build_command(self, message: str, **kwargs) -> list:
        """Build ElevenLabs TTS command."""
        import shlex
        import os
        
        voice = kwargs.get('voice') or self.get_config_value('voice') or self.config['default_voice']
        model = kwargs.get('model') or self.get_config_value('model') or self.config['default_model']
        api_key = self.get_config_value('api_key')
        
        extension_dir = get_extension_path()
        script_path = os.path.join(extension_dir, 'resources', self.config['script'])
        
        # Normalize the path for the current platform
        script_path = os.path.normpath(script_path)
        
        # On Windows, we need to handle paths differently
        # Use VS Code's platform detection since platform.system() doesn't work correctly in Pyodide
        if api.getPlatform() == 'win32':
            script_path = str.replace(script_path, '/', '\\')
            # Don't quote the path here - let the shell handle it
            cmd_parts = ['uv', 'run', script_path, message, '--voice', voice, '--model', model]
        else:
            cmd_parts = ['uv', 'run', script_path, shlex.quote(message), '--voice', voice, '--model', model]
        
        if api_key:
            cmd_parts.extend(['--api-key', api_key])
            
        return cmd_parts

class _AzureProvider(_TTSProvider):
    """Azure Speech Services TTS provider."""
    
    def __init__(self):
        config_data = {
            'script': 'tts/azure_tts.py',
            'default_voice': 'en-US-JennyNeural',
            'default_region': 'eastus',
            'default_format': 'audio-24khz-160kbitrate-mono-mp3',
            'config_keys': {
                'subscription_key': 'tts.azure.subscriptionKey',
                'region': 'tts.azure.region',
                'voice': 'tts.azure.voice',
                'format': 'tts.azure.format'
            }
        }
        super().__init__('azure', config_data)
    
    def validate_config(self) -> tuple[bool, str]:
        """Validate Azure configuration."""
        subscription_key = self.get_config_value('subscription_key')
        if not subscription_key:
            return False, "Azure Speech Services subscription key not configured"
        return True, ""
    
    def build_command(self, message: str, **kwargs) -> list:
        """Build Azure TTS command."""
        import shlex
        import os
        
        voice = kwargs.get('voice') or self.get_config_value('voice') or self.config['default_voice']
        region = self.get_config_value('region') or self.config['default_region']
        format_val = self.get_config_value('format') or self.config['default_format']
        subscription_key = self.get_config_value('subscription_key')
        
        extension_dir = get_extension_path()
        script_path = os.path.join(extension_dir, 'resources', self.config['script'])
        
        # Normalize the path for the current platform
        script_path = os.path.normpath(script_path)
        
        # On Windows, we need to handle paths differently
        # Use VS Code's platform detection since platform.system() doesn't work correctly in Pyodide
        if api.getPlatform() == 'win32':
            script_path = str.replace(script_path, '/', '\\')
            # Don't quote the path here - let the shell handle it
            cmd_parts = ['uv', 'run', script_path, message, '--voice', voice, '--region', region, '--format', format_val]
        else:
            cmd_parts = ['uv', 'run', script_path, shlex.quote(message), '--voice', voice, '--region', region, '--format', format_val]
        
        if subscription_key:
            cmd_parts.extend(['--subscription-key', subscription_key])
            
        return cmd_parts

def _create_tts_provider(provider_name: str) -> _TTSProvider:
    """Factory function to create TTS providers."""
    if provider_name == 'elevenlabs':
        return _ElevenLabsProvider()
    elif provider_name == 'azure':
        return _AzureProvider()
    else:
        raise _TTSError(f"Unsupported TTS provider: {provider_name}")

def _display_tts_info(provider: str, voice, model, tts_provider: _TTSProvider) -> None:
    """Display TTS provider information."""
    if provider == 'elevenlabs':
        final_voice = voice or tts_provider.get_config_value('voice') or tts_provider.config['default_voice']
        final_model = model or tts_provider.get_config_value('model') or tts_provider.config['default_model']
        print(f"[VOICE] Using {provider.title()}: voice={final_voice}, model={final_model}")
    elif provider == 'azure':
        final_voice = voice or tts_provider.get_config_value('voice') or tts_provider.config['default_voice']
        region = tts_provider.get_config_value('region') or tts_provider.config['default_region']
        print(f"[VOICE] Using {provider.title()}: voice={final_voice}, region={region}")

def _talk_web(msg: str) -> bool:
    """Fallback browser-based text-to-speech."""
    try:
        import pyodide
        
        js_code = f"""
        if ('speechSynthesis' in window) {{
            const utterance = new SpeechSynthesisUtterance({repr(msg)});
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            speechSynthesis.speak(utterance);
            true;
        }} else {{
            false;
        }}
        """
        
        # In Pyodide, we need to use the code module to run JavaScript
        import pyodide.code
        result = pyodide.code.run_js(js_code)
        if result:
            print("[AUDIO] Using browser TTS")
            return True
        else:
            print("[ERROR] Browser TTS not available")
            return False
            
    except Exception as e:
        print(f"[ERROR] Browser TTS error: {str(e)}")
        return False

@track_api_call
async def talk(msg, voice=None, model=None, provider=None):
    """
    Convert text to speech using configured TTS provider.
    
    This function provides text-to-speech conversion using either ElevenLabs or Azure Speech Services
    based on the configured provider in VS Code settings.
    
    Args:
        msg (str): Text message to convert to speech. Should be non-empty string.
        voice (str, optional): Voice name. If None, uses extension configuration setting.
                              ElevenLabs: rachel, adam, antoni, etc.
                              Azure: en-US-JennyNeural, en-US-GuyNeural, en-US-AriaNeural, etc.
        model (str, optional): Model to use (ElevenLabs only). If None, uses extension configuration setting.
                              ElevenLabs: eleven_multilingual_v2, eleven_turbo_v2, eleven_flash_v2
        provider (str, optional): TTS provider (elevenlabs, azure). If None, uses extension configuration.
    
    Returns:
        bool: True if successful, False otherwise
    
    Examples:
        import agentworkbook as awb
        await awb.talk("Hello world")  # Uses extension config defaults
        await awb.talk("Fast speech", model="eleven_turbo_v2")  # Override ElevenLabs model
        await awb.talk("Different voice", voice="adam")  # Override voice
        await awb.talk("Hello", provider="azure", voice="en-US-AriaNeural")  # Use Azure
        
    Note:
        - Supports both ElevenLabs and Azure Speech Services TTS providers
        - Uses local Python script via uv run for better dependency management
        - API keys, voices, and settings can be configured in VS Code settings
        - Falls back to browser TTS if local script fails
    """
    # Input validation
    if not msg or not isinstance(msg, str):
        print("[ERROR] Error: Please provide a valid text message")
        return False
    
    try:
        import shlex
        
        # Get provider configuration
        config_provider = get_configuration('tts.provider') or 'elevenlabs'
        final_provider = provider if provider is not None else config_provider
        
        # Create provider instance
        tts_provider = _create_tts_provider(final_provider)
        
        # Validate provider configuration
        is_valid, error_msg = tts_provider.validate_config()
        if not is_valid:
            print(f"[ERROR] Configuration error: {error_msg}")
            print("[FALLBACK] Falling back to browser TTS...")
            return _talk_web(msg)
        
        # Build and execute command
        cmd_parts = tts_provider.build_command(msg, voice=voice, model=model)
        
        # Join the command parts appropriately for the platform
        # Use VS Code's platform detection since platform.system() doesn't work correctly in Pyodide
        if api.getPlatform() == 'win32':
            # On Windows, quote parts that contain spaces
            quoted_parts = []
            for part in cmd_parts:
                if ' ' in part and not (part.startswith('"') and part.endswith('"')):
                    quoted_parts.append(f'"{part}"')
                else:
                    quoted_parts.append(part)
            cmd = ' '.join(quoted_parts)
        else:
            cmd = ' '.join(shlex.quote(part) for part in cmd_parts)
        
        # Display provider information
        _display_tts_info(final_provider, voice, model, tts_provider)
        
        # Debug: Show the command being executed
        if api.getPlatform() == 'win32':
            print(f"[DEBUG] Executing command: {cmd}")
        
        # Execute the command
        result = await execute_shell(cmd)
        
        # Check if the command was successful
        if result.exitCode != 0:
            print(f"[ERROR] TTS command failed with exit code {result.exitCode}")
            if result.stderr:
                print(f"Error: {result.stderr}")
            if result.stdout:
                print(f"Output: {result.stdout}")
            print("[FALLBACK] Falling back to browser TTS...")
            return _talk_web(msg)
        
        print("[OK] TTS successful!")
        return True
        
    except Exception as e:
        print(f"[ERROR] TTS error: {str(e)}")
        print("[FALLBACK] Falling back to browser TTS...")
        return _talk_web(msg)


def _display_elevenlabs_config() -> dict:
    """Display ElevenLabs configuration."""
    provider = _ElevenLabsProvider()
    api_key = provider.get_config_value('api_key')
    voice = provider.get_config_value('voice') or provider.config['default_voice']
    model = provider.get_config_value('model') or provider.config['default_model']
    
    print("[CONFIG] ElevenLabs Configuration:")
    print(f"   [KEY] API Key: {'[OK] Configured' if api_key else '[ERROR] Not configured'}")
    print(f"   [AUDIO] Voice: {voice}")
    print(f"   [MODEL] Model: {model}")
    
    if not api_key:
        print("\n[TIP] Set ElevenLabs API Key:")
        print("   File > Preferences > Settings > Extensions > AgentWorkbook")
        print("   -> TTS > Elevenlabs > API Key")
    
    print("\n[TEST] Test: await awb.talk('Hello from ElevenLabs')")
    
    return {
        'elevenlabs': {
            'api_key_configured': bool(api_key),
            'voice': voice,
            'model': model
        }
    }

def _display_azure_config() -> dict:
    """Display Azure configuration."""
    provider = _AzureProvider()
    subscription_key = provider.get_config_value('subscription_key')
    region = provider.get_config_value('region') or provider.config['default_region']
    voice = provider.get_config_value('voice') or provider.config['default_voice']
    audio_format = provider.get_config_value('format') or provider.config['default_format']
    
    print("[CONFIG] Azure Speech Configuration:")
    print(f"   [KEY] Subscription Key: {'[OK] Configured' if subscription_key else '[ERROR] Not configured'}")
    print(f"   [REGION] Region: {region}")
    print(f"   [AUDIO] Voice: {voice}")
    print(f"   [FORMAT] Format: {audio_format}")
    
    if not subscription_key:
        print("\n[TIP] Set Azure Speech Subscription Key:")
        print("   File > Preferences > Settings > Extensions > AgentWorkbook")
        print("   -> TTS > Azure > Subscription Key")
    
    print("\n[TEST] Test: await awb.talk('Hello from Azure', provider='azure')")
    
    return {
        'azure': {
            'subscription_key_configured': bool(subscription_key),
            'region': region,
            'voice': voice,
            'format': audio_format
        }
    }

@track_api_call 
def setup_tts(provider=None):
    """
    Display current TTS configuration and setup guidance.
    
    This function shows the current TTS provider settings and provides
    guidance on how to configure them through VS Code settings.
    
    Args:
        provider (str, optional): Show settings for specific provider (elevenlabs, azure)
    
    Example:
        import agentworkbook as awb
        awb.setup_tts()  # Show current configuration
        awb.setup_tts("azure")  # Show Azure specific settings
    
    Note:
        Configure settings in VS Code:
        File > Preferences > Settings > Extensions > AgentWorkbook > TTS Settings
    """
    print("[TTS] TTS Configuration")
    print("=" * 40)
    
    # Get current provider
    current_provider = get_configuration('tts.provider') or 'elevenlabs'
    target_provider = provider if provider is not None else current_provider
    
    print(f"[INFO] Current Provider: {current_provider}")
    print(f"[SETTINGS] Showing Settings: {target_provider}")
    print()
    
    config_info = {}
    
    if target_provider == 'elevenlabs':
        config_info = _display_elevenlabs_config()
    elif target_provider == 'azure':
        config_info = _display_azure_config()
    else:
        print(f"[ERROR] Unknown provider: {target_provider}")
        print("[SETTINGS] Available providers: elevenlabs, azure")
        return {'error': f'Unknown provider: {target_provider}'}
    
    print("\n[INFO] Available Settings:")
    print("   - Provider: elevenlabs | azure")
    print("   - ElevenLabs voices: rachel, adam, antoni, bella, josh, etc.")
    print("   - Azure voices: en-US-JennyNeural, en-US-GuyNeural, en-US-AriaNeural, etc.")
    print("   - ElevenLabs models: eleven_multilingual_v2, eleven_turbo_v2, eleven_flash_v2")
    print("   - Azure formats: audio-24khz-160kbitrate-mono-mp3, riff-24khz-16bit-mono-pcm, etc.")
    
    return {
        'provider': current_provider,
        'target_provider': target_provider,
        **config_info
    }

@track_api_call
def set_supercode_url(url: str) -> None:
    """
    Set the SuperCode TUI API base URL for this session.
    
    This function configures the SuperCode server URL that will be used for all
    SuperCode tasks. The URL persists for the current AgentWorkbook session only.
    
    Args:
        url: The base URL of the SuperCode TUI API (e.g., "http://localhost:8080")
    
    Raises:
        Exception: If the URL format is invalid or the connection fails
    
    Examples:
        import agentworkbook as awb
        
        # Set SuperCode URL for local development
        awb.set_supercode_url("http://localhost:8080")
        
        # Set SuperCode URL for remote server
        awb.set_supercode_url("https://supercode.example.com")
        
        # Now all SuperCode tasks will use this URL by default
        tasks = awb.create_tasks(["Hello world"], client='supercode')
        
    Note:
        - URL must be a valid HTTP/HTTPS URL
        - Connection is tested when URL is set
        - URL can be overridden per task using supercode_url parameter
        - Setting a new URL clears any cached SuperCode client connections
    """
    if not url or not isinstance(url, str):
        raise ValueError("SuperCode URL must be a non-empty string")
    
    try:
        api.setSuperCodeUrl(url)
    except Exception as e:
        raise Exception(f"Failed to set SuperCode URL: {str(e)}")

@track_api_call
def get_supercode_url() -> Optional[str]:
    """
    Get the current SuperCode TUI API base URL.
    
    Returns:
        The current SuperCode URL or None if not configured
    
    Examples:
        import agentworkbook as awb
        
        # Check current SuperCode URL
        url = awb.get_supercode_url()
        if url:
            print(f"SuperCode URL is set to: {url}")
        else:
            print("SuperCode URL is not configured")
        
        # Set URL if not configured
        if not awb.get_supercode_url():
            awb.set_supercode_url("http://localhost:8080")
    
    Note:
        - Returns None if SuperCode URL has not been configured
        - URL persists for the current AgentWorkbook session only
    """
    return api.getSuperCodeUrl()

@track_api_call
async def test_supercode_connection(url: Optional[str] = None) -> bool:
    """
    Test connection to SuperCode server.
    
    This function attempts to connect to the SuperCode TUI API server and
    verify that it's responsive. Useful for validating configuration before
    submitting tasks.
    
    Args:
        url: Optional URL to test. If None, uses the currently configured URL
    
    Returns:
        True if connection successful, False otherwise
    
    Examples:
        import agentworkbook as awb
        
        # Test current configured URL
        if await awb.test_supercode_connection():
            print("SuperCode server is responding")
        else:
            print("SuperCode server is not accessible")
        
        # Test a specific URL before setting it
        test_url = "http://localhost:8080"
        if await awb.test_supercode_connection(test_url):
            awb.set_supercode_url(test_url)
            print("SuperCode URL configured successfully")
        else:
            print("SuperCode server not available at that URL")
    
    Note:
        - Tests actual HTTP connectivity to the /tui/status endpoint
        - Uses a short timeout (5 seconds) for quick validation
        - Does not modify the configured SuperCode URL
        - Returns False if URL is None and no URL is configured
    """
    try:
        return await api.testSuperCodeConnection(url)
    except Exception as e:
        print(f"SuperCode connection test failed: {str(e)}")
        return False

@track_api_call
def preview_prompt(prompt: str, workspace_root: Optional[str] = None) -> dict:
    """
    Preview how a prompt will look after flag processing.
    
    This function processes flags in a prompt and returns the transformed version,
    allowing you to see exactly how flags will be rendered and positioned before
    task execution.
    
    Args:
        prompt: The prompt text containing flags (e.g., "Help me --think about this")
        workspace_root: Optional workspace path for flag discovery. If None, uses current workspace.
    
    Returns:
        Dictionary containing:
        - 'original': The original prompt text
        - 'processed': The prompt after flag processing
        - 'flags_found': List of flags that were discovered and processed
        - 'flags_applied': List of flags that were successfully applied
        - 'errors': List of any errors encountered during processing
    
    Examples:
        import agentworkbook as awb
        
        # Basic flag processing preview
        result = awb.preview_prompt("Help me --think about this problem")
        print("Original:", result['original'])
        print("Processed:", result['processed'])
        print("Flags found:", result['flags_found'])
        
        # Preview with multiple flags
        result = awb.preview_prompt("Explain --verbose this --quick concept")
        
        # Preview with hierarchical flags
        result = awb.preview_prompt("Debug --cs:debug this algorithm")
        
        # Preview with parameterized flags (if supported)
        result = awb.preview_prompt("Document --docs(README.md, API Guide) this code")
        
    Note:
        - Shows the complete flag processing pipeline without executing tasks
        - Useful for debugging flag configurations and understanding flag behavior
        - Supports all flag types: basic, hierarchical, parameterized
        - Displays front-matter settings effects (placement, persistence, etc.)
    """
    if not prompt or not isinstance(prompt, str):
        return {
            'original': prompt,
            'processed': prompt,
            'flags_found': [],
            'flags_applied': [],
            'errors': ['Invalid prompt: must be a non-empty string']
        }
    
    try:
        # Call the TypeScript API to process the prompt flags
        result = api.previewPromptFlags(prompt, workspace_root)
        return result
    except Exception as e:
        return {
            'original': prompt,
            'processed': prompt,
            'flags_found': [],
            'flags_applied': [],
            'errors': [f'Error processing flags: {str(e)}']
        }
