# Campaign API

The Campaign API allows the creation and management of promotional campaigns. It supports defining discount types, usage limits, validity periods, and target segments.

## 🚀 Features

- **Campaign Management** - Create, update, and manage promotional campaigns
- **Discount Types** - Support for various discount configurations
- **Usage Limits** - Control campaign usage and restrictions
- **Target Segments** - Define specific audience segments
- **TypeScript** - Full type safety and modern JavaScript
- **Fastify** - High-performance web framework
- **MySQL** - Reliable data persistence
- **OpenTelemetry** - Distributed tracing and observability

## 📋 Prerequisites

- Node.js 18+
- MySQL 8.0+
- Docker (optional)

## 🛠️ Quick Start

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd campaign-api
   npm install
   ```

2. **Set up environment**

   ```bash
   # Create .env file with your configuration
   cp .env.example .env
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 🏗️ Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── infra/          # Infrastructure setup
├── repositories/   # Data access layer
├── routes/         # API routes
├── services/       # Business logic
└── usecases/       # Application use cases
```

## 🚀 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
```

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=campaign_db
DB_USER=root
DB_PASSWORD=password

# OpenTelemetry
OTEL_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=campaign-api
```

### Database Setup

**Using Docker (Recommended)**

```bash
docker-compose up -d mysql
```

**Manual Setup**

- Install MySQL 8.0+
- Create database: `CREATE DATABASE campaign_db;`
- Update `.env` with your credentials

## 📊 API Endpoints

### Health Check

```http
GET /health
```

## 🐳 Docker

```bash
# Development
docker-compose up -d

# Production
docker build -f Dockerfile.local -t campaign-api .
docker run -p 3000:3000 campaign-api
```

## 🧪 Testing

```bash
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # With coverage report
```
