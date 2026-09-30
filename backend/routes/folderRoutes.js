const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const authMiddleware = require('../middleware/authMiddleware');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// Apply authMiddleware to all folder routes
router.use(authMiddleware);

// @route   GET /api/folders
// @desc    Get all folders for logged-in user
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user._id }).sort({ createdAt: 1 });
    return res.status(200).json({
      success: true,
      folders
    });
  } catch (error) {
    console.error('Get folders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving folders'
    });
  }
});

// @route   POST /api/folders
// @desc    Create a new folder
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      });
    }

    const folderName = name.trim();

    // Check if folder with same name exists for this user
    const existing = await Folder.findOne({ userId: req.user._id, name: folderName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Folder with this name already exists'
      });
    }

    const folder = new Folder({
      name: folderName,
      userId: req.user._id
    });

    await folder.save();

    return res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      folder
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating folder'
    });
  }
});

// @route   PUT /api/folders/:id
// @desc    Rename a folder
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New folder name is required'
      });
    }

    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    folder.name = name.trim();
    folder.updatedAt = Date.now();
    await folder.save();

    return res.status(200).json({
      success: true,
      message: 'Folder updated successfully',
      folder
    });
  } catch (error) {
    console.error('Update folder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating folder'
    });
  }
});

// @route   DELETE /api/folders/:id
// @desc    Delete a folder and clean up associated documents
router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Find documents in this folder and delete their files from Cloudinary / disk
    const docs = await Document.find({ folderId: folder._id, userId: req.user._id });
    for (const doc of docs) {
      if (doc.cloudinaryPublicId) {
        try {
          let resCloud = await cloudinary.uploader.destroy(doc.cloudinaryPublicId, { resource_type: doc.cloudinaryResourceType || 'auto' });
          if (resCloud.result !== 'ok') {
            await cloudinary.uploader.destroy(doc.cloudinaryPublicId, { resource_type: 'raw' });
          }
        } catch (e) {
          console.error('Failed to delete file from Cloudinary:', e);
        }
      } else if (doc.filePath && doc.filePath.startsWith('/uploads/')) {
        const fullPath = path.join(__dirname, '..', doc.filePath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {
            console.error('Failed to delete file from disk:', e);
          }
        }
      }
    }

    // Delete documents in MongoDB
    await Document.deleteMany({ folderId: folder._id, userId: req.user._id });

    // Delete folder
    await Folder.deleteOne({ _id: folder._id });

    return res.status(200).json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting folder'
    });
  }
});

module.exports = router;
