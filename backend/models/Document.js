const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: [true, 'File name is required']
    },

    filePath: {
      type: String,
      required: [true, 'File path is required']
    },

    // Cloudinary information
    cloudinaryPublicId: {
      type: String,
      required: true
    },

    cloudinaryResourceType: {
      type: String,
      default: 'auto'
    },

    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: ['pdf', 'docx', 'image', 'other']
    },

    fileSize: {
      type: Number,
      required: [true, 'File size is required']
    },

    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Document', documentSchema);