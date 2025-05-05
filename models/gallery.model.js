const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
});

const Gallery = mongoose.model('Gallery', gallerySchema);

module.exports = Gallery;