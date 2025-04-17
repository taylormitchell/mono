# Time Tracker

A macOS time tracking system with a menu bar app and CLI controller. Track your tasks with a visible countdown in the menu bar and receive desktop notifications when timers complete.

## Components

### 1. macOS Menu Bar App (Swift)

- Displays current task and remaining time in the menu bar
- Provides visual countdown of active timers
- Sends desktop notifications when timers complete
- Runs as a background process
- Includes a REST API server for communication with the CLI

### 2. CLI Controller (TypeScript/Bun)

- Simple command-line interface for controlling the menu bar app
- Start, stop, and check status of timers
- Communicates with the menu bar app via REST API

## Features

- Set timers with custom descriptions
- Specify durations (e.g., "30m", "1h") or specific end times (e.g., "14:30")
- Real-time countdown visible in the macOS menu bar
- Desktop notifications on completion
- Background operation (no need to keep terminal open)

## Installation

### Menu Bar App
```bash
# Open the Swift project in Xcode
open packages/time-tracker/TimerApp/TimerApp.xcodeproj

# Build and run the app
# Or download the pre-built app from the releases page
```

### CLI Tool
```bash
# Navigate to CLI directory
cd packages/time-tracker/cli

# Install dependencies
bun install

# Link the CLI globally (optional)
bun link
```

## Usage

```bash
# Start a timer for 30 minutes
timer start "Complete project proposal" 30m

# Start a timer until 2:30 PM
timer start "Team meeting" 14:30

# Start a timer for 1 hour and 15 minutes
timer start "Study session" 1h15m

# Check status of current timer
timer status

# Stop the current timer
timer stop
```

## Implementation Plan

1. **Menu Bar App (Swift)**
   - Create macOS app with menu bar presence
   - Implement timer countdown functionality
   - Build desktop notification system
   - Create REST API server for external control
   - Design simple UI for the dropdown menu

2. **CLI Tool (TypeScript/Bun)**
   - Initialize TypeScript project
   - Implement commands for timer control (start, stop, status)
   - Create HTTP client to communicate with the menu bar app
   - Build time format parser

3. **Integration**
   - Establish communication protocol between CLI and menu bar app
   - Test end-to-end functionality
   - Handle error cases and edge conditions

4. **Documentation & Distribution**
   - Complete documentation for both components
   - Create installation packages

## Dependencies

### Menu Bar App
- Swift 5+
- macOS 13+ (Ventura or later)
- Vapor (for REST API)

### CLI Tool
- Bun (JavaScript runtime)
- TypeScript
- commander (for CLI argument parsing)
- node-fetch (for API communication)
