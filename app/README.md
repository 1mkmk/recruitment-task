# JSONPlaceholder Post Downloader

A Kotlin application to fetch posts from JSONPlaceholder API, save them as JSON files, and provide a REST API to access them.

## Features

- Fetch posts from JSONPlaceholder API
- Save posts as individual JSON files
- Browse saved posts
- REST API with modern React frontend
- Command-line interface
- Support for different environments (dev, staging, production)
- Dark mode support

## Quick Start

The easiest way to run the application is using the provided PowerShell script:

```powershell
.\start-app.ps1
```

This will start both the backend and frontend in separate windows.

- Backend: http://localhost:8080
- Frontend: http://localhost:5173

## Building and Running Manually

### Backend

```bash
# Build the application
.\gradlew build

# Run in API Server mode
.\gradlew run --args="server"

# Or run with a specific environment
.\gradlew run --args="--env prod --mode api"
```

### Frontend

```bash
# Navigate to frontend directory
cd frontend-react

# Install dependencies (first time only)
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

## Command Line Interface (CLI)

The application can be run in CLI mode with various commands:

```bash
# Show help
.\gradlew run

# Fetch posts (just display them)
.\gradlew run --args="fetch"

# Save all posts to files
.\gradlew run --args="save"

# Save a specific post
.\gradlew run --args="save 1"

# List saved posts
.\gradlew run --args="list"

# Get a specific post
.\gradlew run --args="get 1"

# Clear output directory
.\gradlew run --args="clear"
```

## Setting Environment

You can specify the environment using command-line options:

```bash
# Run in production environment
.\gradlew run --args="-e prod fetch"

# Or use the full option name
.\gradlew run --args="--env production fetch"
```

Available environments:
- `dev` or `development` (default)
- `stage` or `staging`
- `prod` or `production`

## REST API Endpoints

When running in API mode, the application exposes a REST API at `http://localhost:8080/api/` with the following endpoints:

### Posts

- `GET /api/posts` - Get all posts
- `GET /api/posts/{id}` - Get a specific post
- `GET /api/posts/{id}/comments` - Get comments for a post
- `POST /api/posts/save/{id}` - Save a post
- `POST /api/posts/save-all` - Save all posts
- `DELETE /api/posts/{id}` - Delete a saved post
- `DELETE /api/posts` - Clear all saved posts

### Saved Posts

- `GET /api/saved-posts` - List saved posts
- `GET /api/posts/{id}/is-saved` - Check if a post is saved

### Configuration

- `GET /api/info` - Get environment information
- `POST /api/config/output-directory` - Update output directory

## Troubleshooting

If you encounter issues with ports already in use, you can use the provided scripts:

```powershell
# Kill a process on a specific port
.\kill-port.ps1 8080

# Manage multiple ports
.\manage-ports.ps1
```

## License

MIT 