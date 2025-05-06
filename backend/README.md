# Lumen API Backend

This is the backend API service for the Lumen application built with Go and PostgreSQL.

## Prerequisites

- Go 1.16 or higher
- PostgreSQL 12 or higher
- Git

## Project Structure

```
backend/
├── api/            # API handlers, middleware, and router
├── config/         # Configuration management
├── db/             # Database connection and migrations
│   └── migrations/ # SQL migration files
├── models/         # Data models and business logic
├── utils/          # Utility functions
├── .env.example    # Example environment variables
├── go.mod          # Go module definition
├── go.sum          # Go module checksums
└── main.go         # Application entry point
```

## Setup

1. Clone the repository:

```bash
git clone https://github.com/Srivathsav-max/lumen.git
cd lumen/backend
```

2. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

3. Update the `.env` file with your PostgreSQL credentials.

4. Create the PostgreSQL database:

```bash
createdb lumen_db
```

5. Install dependencies:

```bash
go mod tidy
```

## Running the Application

To run the application:

```bash
go run main.go
```

The API server will start on port 8080 (or the port specified in your `.env` file).

## API Endpoints

### Public Endpoints

- `POST /api/v1/register` - Register a new user
- `POST /api/v1/login` - Login and get JWT token
- `GET /api/v1/users/:id` - Get user by ID

### Protected Endpoints (Requires JWT Authentication)

- `GET /api/v1/profile` - Get current user's profile
- `PUT /api/v1/profile` - Update current user's profile

## Authentication

The API uses JWT for authentication. To access protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Development

### Adding New Migrations

To add a new migration:

1. Create a new file in the `db/migrations` directory with the naming convention:
   - `<version>_<description>.up.sql` for the migration
   - `<version>_<description>.down.sql` for the rollback

2. The migrations will be automatically applied when the application starts.

### Adding New API Endpoints

1. Create a new handler function in `api/handlers.go`
2. Add the route to the router in `api/router.go`

## Frontend Integration

The frontend can communicate with this API using standard HTTP requests. Make sure to:

1. Include the JWT token in the Authorization header for protected endpoints
2. Use the appropriate Content-Type header (application/json)
