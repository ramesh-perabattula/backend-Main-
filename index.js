const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const compression = require('compression');
const rateLimiter = require('./middlewares/rateLimiter');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

app.disable('x-powered-by'); // Reduce header size and hide tech stack

// Middleware
app.use(express.json());
app.use(compression()); // Compress responses
app.use(cors());

// Rate Limiter
app.set('trust proxy', 1);
app.use(rateLimiter);

// Debug Middleware (Development only)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        console.log('Headers:', req.headers['authorization'] ? 'Auth Header Present' : 'No Auth Header');
        next();
    });
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/transport', require('./routes/transportRoutes'));
app.use('/api/registrar', require('./routes/registrarRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/library', require('./routes/libraryRoutes'));
app.use('/api/placement', require('./routes/placementRoutes'));
app.use('/api/hostel', require('./routes/hostelRoutes'));

// Make uploads folder static
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
