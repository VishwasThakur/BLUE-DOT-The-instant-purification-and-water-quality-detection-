import React, { useState } from 'react';
import { api } from '../services/api';

const Upload = ({ isOpen, onClose, folders, currentFolder, onUploadSuccess, showToast }) => {
  const [files, setFiles] = useState([]);
  const [targetFolder, setTargetFolder] = useState(currentFolder === 'All Files' ? '' : currentFolder);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      showToast('Please select at least one file');
      return;
    }

    try {
      setUploading(true);
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        if (targetFolder && targetFolder !== 'All Files') {
          formData.append('folderName', targetFolder);
        }
        await api.uploadDocument(formData);
      }

      showToast(files.length > 1 ? `${files.length} files uploaded successfully` : 'File uploaded successfully');
      setFiles([]);
      onUploadSuccess();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Upload Files</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Select Files</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '6px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Target Folder</label>
            <select
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
            >
              <option value="">(No Specific Folder / All Files)</option>
              {folders.map((f) => (
                <option key={f._id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || files.length === 0}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Upload;
