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
│   │   ├── db-schema.ts        # Centralized database type definitions
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

1. **users**: User authentication with admin permissions
   - id (INTEGER, primary key)
   - username (TEXT)
   - password (TEXT)
   - isAdmin (INTEGER) - Boolean flag for admin privileges

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

### Type System

The application uses a centralized type system for database entities, defined in `src/lib/db-schema.ts`. This provides several advantages:

- **Single Source of Truth**: All database entity types are defined in one place
- **Consistent Naming**: Field names follow the database schema conventions (snake_case)
- **Type Safety**: Ensures proper typing throughout the application
- **Extended Types**: Includes specialized types for joined queries (e.g., BoxWithCategory)

When working with database entities, always import types from this file rather than creating local type definitions.

### Authentication Flow

The application uses a username/password authentication system with cookie-based sessions. Authentication is handled by the `authMiddleware.ts` utility, which wraps API routes to ensure they are protected. Frontend authentication state is managed with the `useAuth` hook.

The system now includes a setup page for initial admin user creation when no users exist, and user management for admins under the settings section.

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

The SQLite database is automatically initialized when the application starts. Default tables are created, and when first started with an empty database, you will be directed to a setup page to create the first admin user.

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
- **Database Types**: Use the centralized types from `db-schema.ts` for all database entities
- **Field Naming**: 
  - Use snake_case for database field names (e.g., `category_id`) to match the database schema
  - Use camelCase for local variables and parameters
- **Naming Conventions**:
  - Files: Use camelCase for utilities, PascalCase for components
  - Functions: Use camelCase
  - Components: Use PascalCase
  - Variables: Use camelCase
- **CSS**: Use Tailwind classes directly in components. Group related classes together.
- **Error Handling**: All API calls should include proper error handling and user feedback.
- **Comments**: Add comments for complex logic or non-obvious behavior.

## Deployment using Docker

Follow these steps to get the Box Management System running locally using Docker Compose. This is the recommended way to deploy the application.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Git:** Required to clone the project repository. You can download it from [git-scm.com](https://git-scm.com/).
2.  **Docker and Docker Compose:** Required to build and run the application container. Docker Desktop includes Docker Compose and is available for Windows, macOS, and Linux from [docker.com](https://www.docker.com/products/docker-desktop/).

### Steps

1.  **Get the Code:**
    Open your terminal or command prompt and clone the repository:
    ```bash
    git clone https://github.com/carlhannes/boxmgr.git
    cd boxmgr
    ```
    *(Replace `https://github.com/carlhannes/boxmgr.git` with the actual repository URL if different)*

2.  **Build and Start the Application:**
    While inside the `boxmgr` directory (where the `compose.yml` file is located), run the following command:
    ```bash
    docker compose up --build -d
    ```
    *   This command tells Docker Compose to:
        *   `build`: Build the Docker image based on the `Dockerfile` if it doesn't exist or if changes are detected.
        *   `up`: Create and start the container(s) defined in `compose.yml`.
        *   `-d`: Run the container in detached mode (in the background), so your terminal is free.
    *   Docker Compose will automatically handle creating the necessary network and mounting the `./data` volume to store the application's database (`boxmgr.sqlite`).

3.  **Access the Application:**
    Open your web browser and navigate to:
    [http://localhost:3000](http://localhost:3000)
    The first time you access the application with an empty database, you should be redirected to a setup page to create the initial admin user.

4.  **Stopping the Application:**
    To stop and remove the running container, navigate back to the `boxmgr` directory in your terminal and run:
    ```bash
    docker compose down
    ```
    Your data in the `./data` directory will remain safe.

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
| Initial Setup Page | ✅ Completed | First-time setup page for creating the admin user |
| User Account Management | ✅ Completed | Create, edit, and delete user accounts with admin roles |
| Multi-User Access | ✅ Completed | Admin vs standard user permission levels |
| QR Code Generation | 🔄 Planned | Generate printable QR codes to stick on boxes |
| QR Code Scanner | 🔄 Planned | Scan QR codes on boxes to view their contents |

## Contributing

Contributions are welcome! If you find a bug or want to add a feature, please open an issue to discuss it before submitting a pull request.

## License
See LICENSE.md:
```
            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                    Version 2, December 2004

 Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>

 Everyone is permitted to copy and distribute verbatim or modified
 copies of this license document, and changing it is allowed as long
 as the name is changed.

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

  0. You just DO WHAT THE FUCK YOU WANT TO.

```
