const express = require('express');
const multer = require('multer');
const { getGallery, getUpload, createUpload, deleteUpload } = require('../controllers/gallery.controller.js');

const router = express.Router();

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    },
});
const upload = multer({ storage });


router.get('/', getGallery);
router.get('/:id', getUpload); 
router.post('/upload-image', upload.single('image'), createUpload); 
router.delete('/:id', deleteUpload);

module.exports = router;
