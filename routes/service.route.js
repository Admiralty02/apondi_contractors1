const express = require('express');
const Service = require('../models/service.model');
const router = express.Router();

// Get all services with pagination
router.get('/', async (req, res) => {
    const { page = 1, limit = 10 } = req.query; // Default to page 1 and limit 10

    try {
        const services = await Service.find()
            .skip((page - 1) * limit) // Skip documents for previous pages
            .limit(parseInt(limit)); // Limit the number of documents per page

        const total = await Service.countDocuments(); // Total number of services
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            services,
            total,
            totalPages,
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch services.' });
    }
});

// Add a new service
router.post('/', async (req, res) => {
    const { title, description, price } = req.body;

    if (!title || !description || !price) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const service = new Service({ title, description, price });
        await service.save();
        res.status(201).json(service);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create service.' });
    }
});

// Delete a service by ID
router.delete('/:id', async (req, res) => {
    try {
        const service = await Service.findByIdAndDelete(req.params.id);
        if (!service) {
            return res.status(404).json({ error: 'Service not found.' });
        }
        res.status(200).json({ message: 'Service deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete service.' });
    }
});

module.exports = router;