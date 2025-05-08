# JSONPlaceholder Post Downloader

A full-stack application featuring a Kotlin backend and dual React frontends to fetch, store, and display posts from JSONPlaceholder API.

## Project Structure

- `app/` - Kotlin backend application
- `frontend-react/` - React frontend
- `docker-compose.yml` - Docker configuration for running the entire stack

## Features

- Fetch posts from JSONPlaceholder API
- Save posts as individual JSON files
- Browse saved posts through CLI or web interfaces
- REST API with two React frontend implementations
- Command-line interface for direct interaction
- Support for different environments (dev, staging, production)
- Dark mode support in frontends
- Fully containerized development environment

## Quick Start with Docker

The easiest way to run the entire application stack is using Docker Compose:

```bash
docker-compose up
```

This will start:
- Backend API: http://localhost:8080
- Original Frontend: http://localhost:5173
- New Frontend: http://localhost:3000

## Running Without Docker

### Backend

```bash
cd app
./gradlew build
./gradlew runDevApi
```

### Frontend (Original)

```bash
cd frontend-react
npm install
npm run dev
```

### Frontend (New)

```bash
cd frontend2
npm install
npm run dev
```

## PowerShell Convenience Scripts

Several PowerShell scripts are provided for convenience:

- `app/start-app.ps1` - Start both backend and frontend
- `app/run-backend.ps1` - Run only the backend
- `app/run-frontend.ps1` - Run only the frontend
- `app/kill-port.ps1` - Kill process on specific port
- `app/manage-ports.ps1` - Interactive port management

## Command Line Interface

The backend application can be run in CLI mode with various commands:

```bash
cd app
./gradlew run --args="fetch"    # Fetch posts
./gradlew run --args="save"     # Save all posts
./gradlew run --args="save 1"   # Save a specific post
./gradlew run --args="list"     # List saved posts
./gradlew run --args="get 1"    # Get a specific post
./gradlew run --args="clear"    # Clear output directory
```

## REST API Endpoints

The backend exposes a REST API at `http://localhost:8080/api/` with endpoints for managing posts.

Key endpoints include:
- `GET /api/posts` - Get all posts
- `GET /api/posts/{id}` - Get a specific post
- `POST /api/posts/save/{id}` - Save a post
- `GET /api/saved-posts` - List saved posts

For the complete list of endpoints, see the detailed documentation in `app/README.md`.

## Environment Configuration

You can specify the environment using command-line options:

```bash
./gradlew run --args="-e prod fetch"
```

Available environments:
- `dev` or `development` (default)
- `stage` or `staging`
- `prod` or `production`

## Troubleshooting

If you encounter issues with ports already in use, you can use the provided scripts:

```powershell
# Kill a process on a specific port
.\app\kill-port.ps1 8080
```

## License

MIT