const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const authMiddleware = require('../middleware/authMiddleware');
const cloudinary = require('../config/cloudinary');

// 1. Multer Memory Storage (No files stored locally)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Protect all document routes with auth middleware
router.use(authMiddleware);

// Simple helper function to determine file category
function determineFileType(filename, mimetype) {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  if (ext === 'pdf' || mimetype === 'application/pdf') return 'pdf';
  if (['docx', 'doc'].includes(ext) || mimetype.includes('wordprocessingml') || mimetype.includes('msword')) return 'docx';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext) || mimetype.startsWith('image/')) return 'image';
  return 'other';
}

// Simple helper: Stream memory buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'aivault_documents',
        resource_type: 'auto',
        use_filename: true,
        filename_override: originalName
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Simple helper: Delete file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  if (!publicId) return;
  try {
    let res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (res.result !== 'ok' && resourceType !== 'raw') {
      res = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }
    if (res.result !== 'ok' && resourceType !== 'video') {
      res = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    }
    if (res.result !== 'ok' && resourceType !== 'image') {
      res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
    return res;
  } catch (err) {
    console.error('Cloudinary deletion error:', err);
  }
};

// GET /api/documents - Fetch user documents
router.get('/', async (req, res) => {
  try {
    const { folderId, folderName, type, search } = req.query;
    const filter = { userId: req.user._id };

    if (folderId && folderId !== 'all') {
      filter.folderId = folderId;
    } else if (folderName && folderName !== 'All Files') {
      const targetFolder = await Folder.findOne({ userId: req.user._id, name: folderName });
      if (targetFolder) {
        filter.folderId = targetFolder._id;
      } else {
        return res.status(200).json({ success: true, documents: [] });
      }
    }

    if (type && type !== 'all') {
      filter.fileType = type;
    }

    if (search) {
      filter.fileName = { $regex: search, $options: 'i' };
    }

    const documents = await Document.find(filter)
      .populate('folderId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving documents'
    });
  }
});

// POST /api/documents/upload - Upload file to Cloudinary & save to MongoDB
router.post('/upload', upload.single('file'), async (req, res) => {
  let cloudinaryResult = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a file.'
      });
    }

    const { folderId, folderName } = req.body;
    let targetFolderId = null;

    if (folderId && folderId !== 'null' && folderId !== 'undefined' && folderId !== 'all') {
      targetFolderId = folderId;
    } else if (folderName && folderName !== 'All Files') {
      let folder = await Folder.findOne({ userId: req.user._id, name: folderName.trim() });
      if (!folder) {
        folder = new Folder({ name: folderName.trim(), userId: req.user._id });
        await folder.save();
      }
      targetFolderId = folder._id;
    }

    // 1. Upload file buffer to Cloudinary
    try {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    } catch (uploadError) {
      console.error('Cloudinary Upload Failed:', uploadError);
      return res.status(500).json({
        success: false,
        message: `Cloudinary upload failed: ${uploadError.message || 'Unknown error'}`
      });
    }

    const fileType = determineFileType(req.file.originalname, req.file.mimetype);

    // 2. Save file metadata & Cloudinary URLs in MongoDB
    try {
      const newDoc = new Document({
        fileName: req.file.originalname,
        filePath: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryResourceType: cloudinaryResult.resource_type || 'auto',
        fileType: fileType,
        fileSize: req.file.size,
        folderId: targetFolderId,
        userId: req.user._id
      });
      console.log("SAVING TO MONGODB...");
console.log({
  fileName: req.file.originalname,
  filePath: cloudinaryResult.secure_url,
  cloudinaryPublicId: cloudinaryResult.public_id,
  fileType: fileType,
  fileSize: req.file.size,
  folderId: targetFolderId,
  userId: req.user._id
});
      await newDoc.save();
      console.log("MONGODB SAVE SUCCESS:", newDoc._id);

      const savedDoc = await Document.findById(newDoc._id).populate('folderId', 'name');

      // 3. Return success response with saved document
      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document: savedDoc
      });
    } catch (dbError) {
      console.error('MongoDB Save Failed:', dbError);

      // If MongoDB save fails, delete newly uploaded Cloudinary file
      if (cloudinaryResult && cloudinaryResult.public_id) {
        await deleteFromCloudinary(cloudinaryResult.public_id, cloudinaryResult.resource_type);
      }

      return res.status(500).json({
        success: false,
        message: `Failed to save document in database: ${dbError.message}`
      });
    }
  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error uploading document'
    });
  }
});

// DELETE /api/documents/:id - Delete document from Cloudinary and MongoDB
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // 1. Delete file from Cloudinary
    if (doc.cloudinaryPublicId) {
      await deleteFromCloudinary(doc.cloudinaryPublicId, doc.cloudinaryResourceType);
    }

    // 2. Delete document record from MongoDB
    await Document.deleteOne({ _id: doc._id });

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting document'
    });
  }
});

module.exports = router;
