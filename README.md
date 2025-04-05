# Box Management System

A simple but powerful system for managing your moving boxes and their contents. Keep track of what items are in which boxes, organized by categories, to make unpacking easier and more efficient.

## Screenshot
<img width="980" alt="image" src="https://github.com/user-attachments/assets/83e86bd1-0057-4aef-af45-cb6ad5cc9852" />


## Introduction

The Box Management System was developed to address the common problem of losing track of items during a move. When you have dozens of boxes, it's easy to forget which items are stored where. This application provides a mobile-friendly interface to catalog boxes by category, assign box numbers, and list the contents of each box. When you need to find a specific item, the search functionality lets you locate it quickly.

Key features include:

- **Category Management**: Organize boxes by room or purpose
- **Box Tracking**: Assign numbers and descriptions to boxes
- **Item Cataloging**: Record all items in each box
- **Search Functionality**: Quickly find which box contains a specific item
- **Printable Overviews**: Generate a complete inventory to reference offline
- **Mobile-First Design**: Optimized for phone usage during packing/unpacking
- **AI-Powered Scanning**: Use your camera to scan box contents and automatically identify items
- **Language Support**: Configure the language the AI uses when scanning boxes

## Architecture

### Stack Overview

The actual versions in use according to package.json:

- **Frontend**: React 19 with Next.js 15.2.4
- **Backend**: Next.js API Routes
- **Database**: SQLite via better-sqlite3 11.9.1
- **Styling**: Tailwind CSS 4
- **Authentication**: Simple username/password authentication
- **AI Integration**: Claude AI via Anthropic API for box scanning

### Directory Structure

```
boxmgr/
├── data/
│   └── boxmgr.sqlite       # SQLite database file
├── src/
│   ├── components/         # Reusable UI components
│   ├── layouts/            # Page layout templates
│   ├── lib/                # Shared utilities and hooks
│   │   ├── authMiddleware.ts   # Authentication middleware
│   │   ├── db.ts              # Database connection setup
│   │   ├── useAuth.ts         # Auth hook for components
│   │   └── users.ts           # User management functions
│   ├── pages/              # Page components and API routes
│   │   ├── api/            # Backend API endpoints
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   ├── boxes/      # Box management endpoints
│   │   │   │   └── [id]/   # Box-specific endpoints
│   │   │   │       └── scan.ts # AI-powered box scanning
│   │   │   ├── categories/ # Category management endpoints
│   │   │   ├── items/      # Item management endpoints
│   │   │   ├── settings/   # User settings endpoints 
│   │   │   └── search.ts   # Search functionality
│   │   ├── boxes/          # Box-related pages
│   │   │   └── scan/       # Box scanning interface
│   │   ├── categories/     # Category-related pages
│   │   ├── settings/       # User settings page
│   │   └── print/          # Printable overview
│   └── styles/             # Global styles
└── public/                 # Static assets
```

### Database Schema

The application uses a simple relational database with the following tables:

1. **users**: Simple user authentication
   - id (INTEGER, primary key)
   - username (TEXT)
   - password (TEXT)

2. **categories**: Groups of boxes by purpose or room
   - id (INTEGER, primary key)
   - name (TEXT)
   - color (TEXT) - Color code for visual identification

3. **boxes**: The physical boxes being tracked
   - id (INTEGER, primary key)
   - number (INTEGER) - Box identifier
   - name (TEXT) - Description
   - categoryId (INTEGER) - Foreign key to categories
   - notes (TEXT) - Optional additional information

4. **items**: Individual items stored in boxes
   - id (INTEGER, primary key)
   - name (TEXT) - Item description
   - boxId (INTEGER) - Foreign key to boxes

5. **settings**: User preferences and API keys
   - key (TEXT, primary key) - Setting name
   - value (TEXT) - Setting value
   - description (TEXT) - Optional description
   - updated_at (TIMESTAMP) - Last update time

### Authentication Flow

The application uses a simple username/password authentication system with cookie-based sessions. Authentication is handled by the `authMiddleware.ts` utility, which wraps API routes to ensure they are protected. Frontend authentication state is managed with the `useAuth` hook.

## Development Guide

### Setup Prerequisites

- Node.js 18.0+ 
- npm 9.0+

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/boxmgr.git
   cd boxmgr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the application at http://localhost:3000

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint to check code quality |

### Database Initialization

The SQLite database is automatically initialized when the application starts. Default tables are created, and example users are added if they don't exist. The database file is stored at `data/boxmgr.sqlite`.

Default login credentials:
- Username: `user` / Password: `password`
- Username: `spouse` / Password: `password`

### Adding a New Feature

When adding new features to the application, follow these steps:

1. **Database Changes**: If needed, update the schema in `src/lib/db.ts`
2. **API Endpoint**: Create or modify routes in the appropriate folder under `src/pages/api/`
3. **UI Components**: Add React components in `src/components/` or pages in `src/pages/`
4. **Testing**: Manually test the feature to ensure it works as expected
5. **Documentation**: Update this README if the feature changes the application architecture

### Code Style Guidelines

- **TypeScript**: Use strong typing for all variables and functions. Avoid `any` types.
- **React Components**: Use functional components with hooks.
- **API Routes**: Follow the pattern of separating logic by HTTP method using a switch statement.
- **Naming Conventions**:
  - Files: Use camelCase for utilities, PascalCase for components
  - Functions: Use camelCase
  - Components: Use PascalCase
  - Variables: Use camelCase
- **CSS**: Use Tailwind classes directly in components. Group related classes together.
- **Error Handling**: All API calls should include proper error handling and user feedback.
- **Comments**: Add comments for complex logic or non-obvious behavior.

## Roadmap

Below is a list of planned features and their current status:

| Feature | Status | Description |
|---------|--------|-------------|
| Category Management | ✅ Completed | Create, view, edit, and delete categories |
| Box Management | ✅ Completed | Create, view, edit, and delete boxes within categories |
| Item Tracking | ✅ Completed | Add and remove items from boxes |
| Search Functionality | ✅ Completed | Search across all boxes to find specific items |
| Mobile-First Design | ✅ Completed | UI optimized for use on phones during packing/unpacking |
| Simple Authentication | ✅ Completed | Basic username/password login |
| Printable Overview | ✅ Completed | Generate a printable document of all boxes and items |
| Box Number Assignment | ✅ Completed | Easily assign and track box numbers |
| AI Box Scanning | ✅ Completed | Use your camera to automatically identify box contents |
| Language Settings | ✅ Completed | Configure AI to respond in your preferred language |
| Camera Fallbacks | ✅ Completed | Alternative methods for uploading images when camera access is limited |
| User Account Management | 🔄 Planned | Allow users to change passwords and add new accounts |
| Multi-User Access | 🔄 Planned | Different permission levels for different users |
| QR Code Generation | 🔄 Planned | Generate printable QR codes to stick on boxes |
| QR Code Scanner | 🔄 Planned | Scan QR codes on boxes to view their  contents |

## Contributing

Contributions are welcome! If you find a bug or want to add a feature, please open an issue to discuss it before submitting a pull request.

## License

This project is private and not licensed for public use.

---

© 2025 Box Management System
