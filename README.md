# Chronos - Family Calendar App

A family calendar application built with Electron, React, TypeScript, and Vite.

## Features

- 🗓️ Calendar management
- 👨‍👩‍👧‍👦 Family member organization
- 🎨 Modern UI with Tailwind CSS
- ⚡ Fast development with Vite
- 🔒 Type-safe with TypeScript

## Development

### Prerequisites

- Node.js 18+ and npm

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

This will start both the Vite dev server and Electron app.

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run package` - Package the app for distribution
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
/src
  /main          # Electron main process
  /renderer      # React application
  /shared        # Shared types and constants
```

## License

MIT
