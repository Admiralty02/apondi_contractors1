const mongoose = require('mongoose');
const Gallery = require('../models/gallery.model.js'); // Adjust the path as necessary

const getGallery = async (req, res) => {
    try {
        const gallery = await Gallery.find();
        res.status(200).json(gallery);
    } catch (error) {
        console.error("Error fetching gallery images:", error);
        res.status(500).json({ message: error.message });
    }
};

const getUpload = async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid ID format.' });
    }

    try {
        const image = await Gallery.findById(id);
        if (!image) {
            return res.status(404).json({ message: 'Image not found.' });
        }
        res.status(200).json(image);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    try {
        const newImage = new Gallery({
            filename: req.file.filename,
            url: imageUrl,
        });
        await newImage.save();
        res.status(201).json(newImage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUpload = async (req, res) => {
    try {
        const { id } = req.params;
        const image = await Gallery.findByIdAndDelete(id);
        if (!image) {
            return res.status(404).json({ message: 'Image not found.' });
        }
        res.status(200).json({ message: 'Image deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGallery,
    getUpload,
    createUpload,
    deleteUpload,
};