# Petrol Pump Management System

A comprehensive web application for managing petrol pump operations with advanced analytics, receipt scanning, and intelligent business insights.

![Petrol Pump Management System](https://img.shields.io/badge/Next.js-15.2.4-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-6.16.0-green?style=for-the-badge&logo=mongodb)
![Python](https://img.shields.io/badge/Python-3.9+-yellow?style=for-the-badge&logo=python)

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - Secure login/signup with JWT tokens
- **Receipt Processing** - Advanced OCR technology for automatic receipt data extraction
- **Dashboard Analytics** - Comprehensive business insights and performance metrics
- **Data Visualization** - Interactive charts and graphs for sales, volume, and fuel distribution
- **User Management** - Multi-user support with role-based access

### Advanced Features
- **OCR Technology** - Automatic extraction of pump data, sales, and volume information
- **Real-time Analytics** - Live dashboard with key performance indicators
- **Receipt Upload** - Drag-and-drop interface for receipt image uploads
- **Data Export** - Export analytics data for external analysis
- **Responsive Design** - Mobile-first design that works on all devices

### Technical Features
- **Modern Stack** - Built with Next.js 15, TypeScript, and Tailwind CSS
- **Database Integration** - MongoDB for scalable data storage
- **Python Integration** - Advanced OCR processing with OpenCV and Tesseract
- **Security** - JWT authentication, password hashing, and secure file uploads
- **Performance** - Optimized builds and efficient data processing

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.2.4** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **Recharts** - Data visualization library
- **Lucide React** - Beautiful icons

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - NoSQL database for data storage
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **Python** - OCR processing and data extraction

### OCR & Image Processing
- **OpenCV** - Computer vision library
- **Tesseract OCR** - Optical character recognition
- **Pillow (PIL)** - Python imaging library
- **NumPy** - Numerical computing

## 📋 Prerequisites

Before running this application, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (local or cloud instance)
- **Tesseract OCR** (for receipt processing)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Ankushsph/petrol-pump-management.git
cd petrol-pump-management
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/petrol-pump-management

# JWT Secret (use a strong secret in production)
JWT_SECRET=your-super-secret-jwt-key-here

# Python Executable (optional, defaults to 'python')
PYTHON_EXECUTABLE=python
```

### 4. Setup OCR (Required for Receipt Processing)
Follow the detailed instructions in [OCR-SETUP.md](./OCR-SETUP.md) to install Tesseract OCR.

### 5. Verify Dependencies
```bash
# Check Python dependencies
python check_python_deps.py

# Test MongoDB connection
npm run dev
# Visit http://localhost:3000/api/test-db
```

### 6. Run the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
petrol-pump-management/
├── app/                          # Next.js App Router
│   ├── api/                     # API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── dashboard/          # Analytics endpoints
│   │   ├── receipts/           # Receipt processing
│   │   └── users/              # User management
│   ├── dashboard/              # Dashboard pages
│   ├── login/                  # Authentication pages
│   └── signup/
├── components/                  # Reusable UI components
│   └── ui/                     # Shadcn/ui components
├── lib/                        # Utility libraries
│   ├── auth.ts                 # Authentication utilities
│   ├── mongodb.ts              # Database connection
│   └── receipt_processor.py    # OCR processing script
├── public/                     # Static assets
│   └── uploads/                # Receipt images
├── styles/                     # Global styles
└── hooks/                      # Custom React hooks
```

## 🔧 Configuration

### MongoDB Setup
1. **Local MongoDB**: Install MongoDB locally and update `MONGODB_URI`
2. **MongoDB Atlas**: Use cloud MongoDB and update connection string
3. **Database**: The app uses `loginDB` database with collections:
   - `users` - User accounts and authentication
   - `receipts` - Processed receipt data
   - `test` - Connection testing

### OCR Configuration
- **Tesseract Path**: Automatically detected on Windows
- **Python Dependencies**: Install via `pip install -r requirements.txt`
- **Image Processing**: Supports JPG, PNG, and other common formats

## 📊 Features Overview

### Dashboard
- **Sales Analytics** - Total sales, volume sold, and transaction counts
- **Visual Charts** - Bar charts, line charts, and pie charts
- **Monthly Trends** - Sales and volume trends over time
- **Fuel Distribution** - Breakdown by fuel type (Petrol, Diesel, Premium)

### Receipt Processing
- **Automatic Upload** - Drag-and-drop receipt images
- **OCR Extraction** - Automatic data extraction from receipts
- **Data Validation** - Verification of extracted information
- **Storage** - Secure storage of receipt images and data

### User Management
- **Authentication** - Secure login/signup system
- **Session Management** - JWT-based session handling
- **User Profiles** - User account management
- **Access Control** - Protected routes and API endpoints

## 🧪 Testing

### API Testing
```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Test authentication
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### OCR Testing
```bash
# Test OCR processing
python lib/receipt_processor.py public/uploads/sample-receipt.jpg
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker
```bash
# Build Docker image
docker build -t petrol-pump-management .

# Run container
docker run -p 3000:3000 petrol-pump-management
```

### Manual Deployment
### Render.com (1-click Blueprint)

1. Ensure your changes are pushed to GitHub (branch `main`).
2. Create a MongoDB Atlas cluster and get the connection string.
3. In the repo root we ship `render.yaml`. On Render:
   - New → Blueprint → "Use a public Git repository" → paste your repo URL.
   - Review the service and click "Apply".
   - Set environment variables in the Render dashboard:
     - `MONGODB_URI` = your Mongo connection string
     - `JWT_SECRET` = a strong random string
     - `USE_NODE_OCR` = `true` (uses tesseract.js, no Python needed)
   - Click "Deploy".

Notes:
- We set `output: 'standalone'` for efficient Next.js deployment.
- File uploads are stored under `public/uploads` and are ephemeral on Render (reset on deploy). For persistence, use S3-compatible storage and update the upload route accordingly.

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **Input Validation** - Server-side validation for all inputs
- **File Upload Security** - Secure file handling and validation
- **CORS Protection** - Cross-origin request protection
- **Environment Variables** - Sensitive data in environment variables

## 📈 Performance

- **Next.js Optimization** - Automatic code splitting and optimization
- **Image Optimization** - Next.js Image component for optimal loading
- **Database Indexing** - Optimized MongoDB queries
- **Caching** - Efficient data caching strategies
- **Bundle Analysis** - Optimized JavaScript bundles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ankush Sph**
- GitHub: [@Ankushsph](https://github.com/Ankushsph)

## 🙏 Acknowledgments

- **Next.js Team** - For the amazing React framework
- **MongoDB** - For the robust database solution
- **Tesseract OCR** - For optical character recognition
- **OpenCV** - For computer vision capabilities
- **Tailwind CSS** - For the utility-first CSS framework

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/Ankushsph/petrol-pump-management/issues) page
2. Review the [OCR-SETUP.md](./OCR-SETUP.md) for OCR-related issues
3. Create a new issue with detailed information

## 🔄 Version History

- **v0.1.0** - Initial release with core functionality
  - User authentication
  - Receipt processing with OCR
  - Dashboard analytics
  - Data visualization

---

**Made with ❤️ for efficient petrol pump management**
