# Amplifi Frontend

A modern React-based frontend application for the Amplifi project management system.

## Features

- **Modern React 18** with TypeScript
- **Next.js 14** for server-side rendering and routing
- **Tailwind CSS** for styling
- **User Authentication** with JWT tokens
- **User Management Interface**
- **Responsive Design**
- **English Language Support**
- **Docker Containerization**
- **AWS Deployment Ready**

## Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ddam-ik-amplifi/amplifi-frontend.git
   cd amplifi-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

The application will be available at `http://localhost:3000`

## Project Structure

```
amplifi-frontend/
├── app/                    # Next.js 13+ App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── auth/              # Authentication pages
│   │   ├── login/         # Login page
│   │   └── register/      # Registration page
│   ├── dashboard/         # Dashboard pages
│   └── users/             # User management pages
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   ├── auth/             # Auth-related components
│   └── users/            # User-related components
├── lib/                  # Utility libraries
│   ├── api.ts           # API client
│   ├── auth.ts          # Auth utilities
│   └── utils.ts         # General utilities
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── public/             # Static assets
├── styles/             # Additional stylesheets
└── next.config.js      # Next.js configuration
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME="Amplifi"

# Authentication
NEXT_PUBLIC_JWT_SECRET=your-jwt-secret

# Environment
NODE_ENV=development
```

## Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## Key Features

### Authentication System
- Login/Register forms
- JWT token management
- Protected routes
- User session handling

### User Management
- User profile management
- User list (admin only)
- Role-based access control
- Account settings

### Dashboard
- Clean, modern interface
- Responsive design
- Easy navigation
- Real-time updates

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: React Context + hooks
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Icons**: Lucide React

## Deployment

### Docker

```bash
# Build image
docker build -t amplifi-frontend .

# Run container
docker run -p 3000:3000 --env-file .env.local amplifi-frontend
```

### AWS ECS

The application is configured for AWS ECS deployment. See the `aws-infrastructure/` directory for complete deployment setup.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License