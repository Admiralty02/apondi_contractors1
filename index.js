const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');
const morgan = require('morgan');
const galleryRoute = require('./routes/gallery.route.js');
const blogRoute = require('./routes/blog.route.js');
const feedbackRoute = require('./routes/feedback.route.js');
const projectRoute = require('./routes/project.route.js');
const serviceRoute = require('./routes/service.route.js');
const adminRoute = require('./routes/admin.route.js');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const cors = require('cors');

const app = express();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads'));
app.use(morgan('combined'));
app.use(cors({
    origin: 'http://localhost:5500', // Replace with your frontend's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage }); 

// File Upload Route
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

// Routes
app.use('/api/gallery', galleryRoute);
app.use('/api/blogs', blogRoute);
app.use('/api/feedbacks', feedbackRoute);
app.use('/api/projects', projectRoute);
app.use('/api/services', serviceRoute);
app.use('/api/admin', adminRoute);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/admin', adminRoute);

app.get('/', (req, res) => {
    res.send('Hello from Node API Updated!');
});

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'your-default-mongo-uri-here';
mongoose
    .connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('MongoDB connection successful!');
        app.listen(3000, () => {
            console.log('Server is running on port 3000');
        });
    })
    .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
    });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});