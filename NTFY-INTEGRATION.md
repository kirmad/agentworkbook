# ntfy Integration for AgentWorkbook

AgentWorkbook now supports sending push notifications via [ntfy](https://ntfy.sh) - a simple, HTTP-based pub-sub notification service. Send notifications to your phone, desktop, or any device when tasks complete, builds finish, or errors occur.

## 🚀 Quick Start

### 1. Configure ntfy Topic

Open VS Code Settings (`Ctrl/Cmd + ,`) and search for "agentworkbook ntfy":

- **Notification › Ntfy › Topic**: Set to your desired topic name (e.g., `my-notifications`)

### 2. Send Your First Notification

```python
import agentworkbook as awb

# Basic notification
await awb.ntfy("Hello from AgentWorkbook!")
```

### 3. Subscribe to Notifications

Visit [ntfy.sh](https://ntfy.sh) or install the ntfy mobile app to subscribe to your topic and receive notifications.

## 📱 Setup Guide

### Option 1: Use ntfy.sh (Public Server)
1. No server setup required
2. Use default server: `https://ntfy.sh`
3. Pick a unique topic name (e.g., `john-agentworkbook-2024`)
4. Subscribe via web or mobile app

### Option 2: Self-Hosted Server
1. Set up your own ntfy server
2. Configure server URL in settings: `https://your-ntfy.server.com`
3. Use any topic name you want

## ⚙️ Configuration

Configure in VS Code Settings (`File > Preferences > Settings`):

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `notification.ntfy.server` | string | `https://ntfy.sh` | ntfy server URL |
| `notification.ntfy.topic` | string | _(empty)_ | **Required** Default topic/channel |
| `notification.ntfy.priority` | number | `3` | Default priority (1-5) |
| `notification.ntfy.tags` | string | _(empty)_ | Default tags, comma-separated |

### Configuration Helper

```python
import agentworkbook as awb

# Show current configuration and setup guide
awb.setup_ntfy()
```

## 🎯 Usage Examples

### Basic Notifications

```python
import agentworkbook as awb

# Simple notification (uses config defaults)
await awb.ntfy("Build completed successfully!")

# With custom topic
await awb.ntfy("Deployment finished!", topic="alerts")
```

### Priority Levels

```python
# Low priority
await awb.ntfy("FYI: New version available", priority=2)

# Default priority (3)
await awb.ntfy("Task completed")

# High priority
await awb.ntfy("Build failed!", priority=4)

# Maximum priority (urgent)
await awb.ntfy("Server down!", priority=5)
```

### Tags and Titles

```python
# With tags for categorization
await awb.ntfy("System maintenance starting", 
               tags=["maintenance", "scheduled"])

# With custom title
await awb.ntfy("All services are operational", 
               title="System Status",
               tags=["status", "ok"])
```

### Custom Server

```python
# Use your own ntfy server
await awb.ntfy("Private notification",
               server="https://my-ntfy.example.com",
               topic="private-alerts")
```

### Advanced Features

```python
# Delayed notification (5 minutes)
await awb.ntfy("Remember to check logs", delay="5m")

# Click URL
await awb.ntfy("New dashboard available",
               click="https://dashboard.example.com")

# With attachment
await awb.ntfy("Check this chart",
               attach="https://example.com/chart.png")

# Combined advanced features
await awb.ntfy("Build report ready",
               title="CI/CD Pipeline",
               priority=4,
               tags=["ci", "success"],
               click="https://ci.example.com/build/123",
               delay="30s")
```

## 🔧 Integration Patterns

### Task Completion Notifications

```python
import agentworkbook as awb

# Create and run task with notification
async def notify_on_completion():
    # Start a task
    task = awb.create_task("Analyze the codebase for performance issues")
    task.submit()
    
    # Wait for completion
    results = await awb.wait_for_tasks([task])
    
    # Notify based on result
    if results[task.id] == 'completed':
        await awb.ntfy("✅ Code analysis completed successfully!",
                       priority=3, tags=["analysis", "complete"])
    else:
        await awb.ntfy("❌ Code analysis failed",
                       priority=4, tags=["analysis", "error"])

await notify_on_completion()
```

### Build Pipeline Notifications

```python
async def build_with_notifications():
    # Start build
    await awb.ntfy("🚀 Build pipeline started", tags=["build", "start"])
    
    try:
        # Run build steps
        test_task = awb.submit_task("Run all tests")
        await awb.wait_for_tasks([test_task])
        
        build_task = awb.submit_task("Build and package application")
        await awb.wait_for_tasks([build_task])
        
        # Success notification
        await awb.ntfy("✅ Build completed successfully!",
                       title="Build Pipeline",
                       priority=3,
                       tags=["build", "success"],
                       click="https://ci.example.com")
                       
    except Exception as e:
        # Error notification
        await awb.ntfy(f"❌ Build failed: {str(e)}",
                       title="Build Pipeline",
                       priority=5,
                       tags=["build", "error"])
```

### Monitoring and Alerts

```python
async def system_monitor():
    """Monitor system and send alerts"""
    
    # Check system health
    health_task = awb.submit_task("Check system health metrics")
    results = await awb.wait_for_tasks([health_task])
    
    # Example: Parse health results and alert
    if "high_cpu" in results:
        await awb.ntfy("⚠️ High CPU usage detected",
                       title="System Alert",
                       priority=4,
                       tags=["monitoring", "cpu", "warning"])
    
    if "low_disk" in results:
        await awb.ntfy("💾 Low disk space warning",
                       title="System Alert",
                       priority=4,
                       tags=["monitoring", "disk", "warning"])

# Run monitor
await system_monitor()
```

## 🔒 Security Considerations

### Private Notifications
- Use unique, hard-to-guess topic names (e.g., `user-project-random123`)
- Consider self-hosting ntfy for sensitive notifications
- Topics are publicly accessible on ntfy.sh by default

### Self-Hosted Setup
```python
# Use your private server
await awb.ntfy("Sensitive information",
               server="https://private-ntfy.company.com",
               topic="secure-alerts")
```

## 📱 Mobile App Setup

### iOS
1. Install [ntfy app from App Store](https://apps.apple.com/app/ntfy/id1625396347)
2. Add subscription to your topic
3. Enable notifications in iOS settings

### Android
1. Install [ntfy from Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/)
2. Add subscription to your topic
3. Configure notification preferences

### Web Browser
- Visit [ntfy.sh](https://ntfy.sh)
- Enter your topic name
- Allow browser notifications when prompted

## 🛠️ Troubleshooting

### Common Issues

**"No topic specified" error:**
```python
# Solution: Configure topic in VS Code settings or provide it
await awb.ntfy("Test", topic="my-topic")
```

**Notifications not received:**
1. Verify topic name matches subscription
2. Check ntfy server is accessible
3. Confirm device/browser notification permissions

**curl command failed:**
1. Ensure internet connectivity
2. Verify ntfy server URL is correct
3. Check if corporate firewall blocks external requests

### Debug Information

```python
# Check current configuration
config_info = awb.setup_ntfy()
print(config_info)

# Test with explicit parameters
success = await awb.ntfy("Debug test",
                         server="https://ntfy.sh",
                         topic="debug-topic",
                         priority=1)
print(f"Test result: {success}")
```

## 🎨 Emoji and Formatting

ntfy supports emojis and basic formatting:

```python
# Emojis in messages
await awb.ntfy("🎉 Deployment successful!")
await awb.ntfy("⚠️ High memory usage detected")
await awb.ntfy("🔥 Critical error in production")

# Tags with emojis
await awb.ntfy("Build completed",
               tags=["✅", "build", "success"])
```

## 📚 Additional Resources

- [ntfy Documentation](https://docs.ntfy.sh/)
- [ntfy GitHub Repository](https://github.com/binwiederhier/ntfy)
- [Self-hosting Guide](https://docs.ntfy.sh/install/)
- [Mobile App Setup](https://docs.ntfy.sh/subscribe/phone/)

## 🤝 Contributing

Found a bug or want to improve ntfy integration? Please submit issues and pull requests to the [AgentWorkbook repository](https://github.com/kirmad/agentworkbook).

---

**Happy Coding with Notifications! 🚀📱**