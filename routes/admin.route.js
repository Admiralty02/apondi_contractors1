const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Admin = require('../models/admin.model.js');
const Blog = require('../models/blog.model.js');
const Service = require('../models/service.model.js');
const Feedback = require('../models/feedback.model.js');
const Project = require('../models/project.model.js'); 
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { ref, uploadBytes, getDownloadURL } = require('firebase/storage');

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save files to the 'uploads' directory
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
        cb(null, true);
    },
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per window
    message: 'Too many login attempts. Please try again later.',
});

// Admin Login
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (error) {
        console.error('Error logging in admin:', error);
        res.status(500).json({ error: 'Failed to log in admin.' });
    }
});

// Get Admin Profile (Protected Route)
router.get('/profile', authenticateAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id).select('-password');
        res.status(200).json(admin);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch admin profile.' });
    }
});

// Middleware to Authenticate Admin
function authenticateAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Check if the user is a super admin
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token.' });
    }
}

// Restrict registration to a single super admin
router.post('/register-status', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if an admin already exists
        const existingAdmin = await Admin.findOne();
        if (existingAdmin) {
            return res.status(403).json({ error: 'Super admin already exists. Registration is disabled.' });
        }

        const admin = new Admin({ username, password });
        await admin.save();

        res.status(201).json({ message: 'Admin registered successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred during registration.' });
    }
});

// CMS: Manage Blogs
router.get('/api/blogs', authenticateAdmin, async (req, res) => {
    try {
        const blogs = await Blog.find();
        res.status(200).json(blogs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch blogs.' });
    }
});

router.post(
    '/api/blogs',
    authenticateAdmin,
    [
        body('title').notEmpty().withMessage('Title is required'),
        body('content').notEmpty().withMessage('Content is required'),
        body('author').notEmpty().withMessage('Author is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, content, author } = req.body;

        try {
            const blog = new Blog({ title, content, author });
            await blog.save();
            res.status(201).json(blog);
        } catch (err) {
            res.status(500).json({ error: 'Failed to create blog.' });
        }
    }
);

router.delete('/api/blogs/:id', authenticateAdmin, async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found.' });
        }
        res.status(200).json({ message: 'Blog deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete blog.' });
    }
});

// CMS: Manage Services
router.get('/api/services', authenticateAdmin, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const services = await Service.find()
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        const total = await Service.countDocuments();

        res.status(200).json({
            services,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
        });
    } catch (err) {
        console.error(`Error fetching services: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch services.' });
    }
});

router.post(
    '/api/services',
    authenticateAdmin,
    [
        body('title').notEmpty().withMessage('Title is required'),
        body('description').notEmpty().withMessage('Description is required'),
        body('price').isNumeric().withMessage('Price must be a number'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { title, description, price } = req.body;

        try {
            const service = new Service({ title, description, price });
            await service.save();
            console.log(`Admin ${req.user.id} created a service: ${title}`);
            res.status(201).json(service);
        } catch (err) {
            console.error(`Error creating service: ${err.message}`);
            res.status(500).json({ error: 'Failed to create service.' });
        }
    }
);

router.delete('/api/services/:id', authenticateAdmin, async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
            return res.status(404).json({ error: 'Service not found.' });
        }
        res.status(200).json({ message: 'Service deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete service.' });
    }
});

// CMS: View Feedback
router.get('/api/feedback', authenticateAdmin, async (req, res) => {
    try {
        const feedback = await Feedback.find();
        res.status(200).json(feedback);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch feedback.' });
    }
});

// CMS: Manage Projects
router.get('/api/projects', authenticateAdmin, async (req, res) => {
    try {
        const projects = await Project.find();
        res.status(200).json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch projects.' });
    }
});

router.post('/api/projects', authenticateAdmin, async (req, res) => {
    const { title, description, link } = req.body;

    try {
        const project = new Project({ title, description, link });
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create project.' });
    }
});

router.delete('/api/projects/:id', authenticateAdmin, async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found.' });
        }
        res.status(200).json({ message: 'Project deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete project.' });
    }
});

// File Upload Route
router.post('/upload', authenticateAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const fileRef = ref(storage, `uploads/${req.file.filename}`);
        const metadata = { contentType: req.file.mimetype };

        // Upload the file to Firebase Storage
        await uploadBytes(fileRef, req.file.buffer, metadata);

        // Get the file's download URL
        const fileUrl = await getDownloadURL(fileRef);

        res.status(200).json({ message: 'File uploaded successfully.', fileUrl });
    } catch (err) {
        console.error('Error uploading file to Firebase Storage:', err);
        res.status(500).json({ error: 'Failed to upload file to Firebase Storage.' });
    }
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        // Check if the admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({ error: 'Admin already exists.' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new admin
        const admin = new Admin({ username, password: hashedPassword });
        await admin.save();

        res.status(201).json({ message: 'Admin registered successfully.' });
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ error: 'Failed to register admin.' });
    }
});

// Check if a superuser exists
router.get('/register-status', async (req, res) => {
    try {
        const superuserExists = await Admin.exists({});
        res.status(200).json({ superuserExists });
    } catch (error) {
        console.error('Error checking registration status:', error);
        res.status(500).json({ error: 'Failed to check registration status.' });
    }
});

module.exports = router;