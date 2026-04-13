# Project Structure - Tourism Platform

## 📁 Root Directory
```
tourismepfe/
├── 📄 README.md                    # Project documentation
├── 📄 TROUBLESHOOTING.md           # Troubleshooting guide
├── 📄 package.json                # Dependencies and scripts
├── 📄 package-lock.json           # Locked dependencies
├── 📄 tailwind.config.js          # Tailwind CSS configuration
├── 📄 postcss.config.js           # PostCSS configuration
├── 📁 database/                   # Database schema and migrations
├── 📁 backend/                    # Backend application
└── 📁 frontend/                   # Frontend application
```

## 🗄️ Database Directory
```
database/
├── 📄 add_bio_column.sql                    # Bio column migration
├── 📄 create_booking_reviews_tables.sql    # Booking and reviews tables
├── 📄 create_table_simple.sql              # Basic table creation
├── 📄 create_test_table.sql                # Test table setup
├── 📄 database-messagerie.sql             # Messaging system schema
├── 📄 database-verification.sql            # Email verification setup
├── 📄 fix_avis_column.sql                 # Reviews column fix
├── 📄 tourisme_tn (1).sql                # Main database export
└── 📄 update_plans_touristiques_table.sql   # Plans table updates
```

## 🔧 Backend Directory
```
backend/
├── 📄 .env                              # Environment variables
├── 📄 app.js                            # Main application entry point
├── 📁 config/                           # Database configuration
├── 📁 controllers/                      # Business logic controllers
├── 📁 middlewares/                      # Express middleware
├── 📁 models/                           # Data models
├── 📁 routes/                           # API routes
├── 📁 public/                           # Static files
└── 📁 utils/                            # Utility functions
```

## 🎨 Frontend Directory
```
frontend/
├── 📁 public/                           # Static assets
│   ├── 📁 css/                         # Stylesheets
│   ├── 📁 images/                      # Image assets
│   └── 📁 uploads/                     # User uploads
├── 📁 views/                           # Handlebars templates
│   ├── 📁 auth/                        # Authentication pages
│   │   ├── 📄 login.hbs
│   │   ├── 📄 inscription.hbs
│   │   └── 📄 verification.hbs
│   ├── 📁 errors/                      # Error pages
│   │   ├── 📄 404.hbs
│   │   └── 📄 500.hbs
│   ├── 📁 public/                      # Public pages
│   │   ├── 📄 accueil.hbs
│   │   ├── 📄 home.hbs
│   │   ├── 📄 guides.hbs
│   │   ├── 📄 plans.hbs
│   │   ├── 📄 rechercher.hbs
│   │   ├── 📄 delegation-detail.hbs
│   │   └── 📄 gouvernorat-details.hbs
│   ├── 📁 admin/                       # Admin dashboard
│   ├── 📁 guide/                       # Guide interfaces
│   ├── 📁 touriste/                    # Tourist interfaces
│   ├── 📁 plans/                       # Plan management
│   ├── 📁 messages/                    # Messaging system
│   ├── 📁 layouts/                     # Template layouts
│   └── 📁 partials/                    # Template partials
├── 📄 tailwind.config.js              # Tailwind configuration
└── 📁 css/                           # Compiled styles
```

## 🏗️ Architecture Overview

### Backend Architecture
- **Express.js** - Web framework
- **Handlebars** - Template engine
- **MySQL** - Database
- **Socket.io** - Real-time communication
- **Multer** - File upload handling

### Frontend Architecture
- **Handlebars** - Server-side templating
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - Client-side interactions

### Key Features
- 🔐 User authentication (Admin, Guide, Tourist)
- 📋 Guide validation system
- 🗺️ Tourism plan management
- 💬 Real-time messaging
- 📊 Admin dashboard
- 📝 Review and rating system
- 💳 Payment integration

### Database Schema
- **utilisateurs** - User accounts
- **guides** - Guide profiles
- **touristes** - Tourist profiles
- **plans_touristiques** - Tourism plans
- **messages** - Messaging system
- **notifications** - Notification system
- **avis** - Reviews and ratings
- **reservations** - Booking system

## 🚀 Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your database credentials
   ```

3. **Setup database**
   ```bash
   # Import the main database schema
   mysql -u username -p database_name < database/tourisme_tn\ \(1\).sql
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## 📝 Notes

### Security
- Password hashing with bcrypt
- Session-based authentication
- File upload validation
- SQL injection protection

### Performance
- Database connection pooling
- Static file caching
- Optimized queries
- Image compression

### Code Quality
- Modular architecture
- Separation of concerns
- Error handling
- Input validation

---

*This project follows professional development standards with clean architecture and comprehensive documentation.*
