const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        enum: ['Structural Engineering', 'Geotechnical Engineering', 'Construction Management', 'Transportation', 'Other'],
        default: 'Other',
    },
    startDate: {
        type: Date,
        default: Date.now,
    },
    endDate: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started',
    },
    image: {
        type: String,
        trim: true,
    },
    
    technologies: {
        type: [String],
        default: [],
    },
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;