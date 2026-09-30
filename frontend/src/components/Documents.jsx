import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Upload from './Upload';

function formatSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function fileIconLabel(type) {
  switch (type) {
    case 'pdf': return 'PDF';
    case 'docx': return 'DOC';
    case 'image': return 'IMG';
    default: return 'FILE';
  }
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const Documents = () => {
  const { user, logout } = useAuth();
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('All Files');
  const [currentSearch, setCurrentSearch] = useState('');
  const [currentTypeFilter, setCurrentTypeFilter] = useState('all');
  const [selectedAiFile, setSelectedAiFile] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastShow, setToastShow] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setToastShow(true);
    setTimeout(() => setToastShow(false), 2500);
  };

  const loadFolders = useCallback(async () => {
    try {
      const res = await api.getFolders();
      setFolders(res.folders || []);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      setLoadingDocs(true);
      const res = await api.getDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadDocuments();
  }, [loadFolders, loadDocuments]);

  // Handle creating a new folder in MongoDB
  const handleAddFolder = async () => {
    const name = prompt('New folder name:');
    if (!name || !name.trim()) return;

    try {
      await api.createFolder(name.trim());
      showToast(`Folder "${name.trim()}" created`);
      loadFolders();
    } catch (err) {
      showToast(err.message || 'Failed to create folder');
    }
  };

  // Handle renaming a folder in MongoDB
  const handleRenameFolder = async (folder, e) => {
    e.stopPropagation();
    const newName = prompt(`Rename folder "${folder.name}" to:`, folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;

    try {
      await api.updateFolder(folder._id, newName.trim());
      showToast(`Folder renamed to "${newName.trim()}"`);
      if (currentFolder === folder.name) {
        setCurrentFolder(newName.trim());
      }
      loadFolders();
      loadDocuments();
    } catch (err) {
      showToast(err.message || 'Failed to rename folder');
    }
  };

  // Handle deleting a folder from MongoDB
  const handleDeleteFolder = async (folder, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete folder "${folder.name}" and all its contents?`)) return;

    try {
      await api.deleteFolder(folder._id);
      showToast(`Folder "${folder.name}" deleted`);
      if (currentFolder === folder.name) {
        setCurrentFolder('All Files');
      }
      loadFolders();
      loadDocuments();
    } catch (err) {
      showToast(err.message || 'Failed to delete folder');
    }
  };

  // Handle deleting a document from MongoDB
  const handleDeleteDocument = async (id) => {
    try {
      await api.deleteDocument(id);
      showToast('File deleted');
      loadDocuments();
    } catch (err) {
      showToast(err.message || 'Failed to delete file');
    }
  };

  // Handle logout confirmation
  const handleLogout = () => {
    if (confirm('Log out of VaultAI?')) {
      logout();
    }
  };

  // Filter documents by search, type, and current folder
  const filteredDocuments = documents.filter((doc) => {
    const docFolderName = doc.folderId ? doc.folderId.name : 'All Files';
    const matchesFolder = currentFolder === 'All Files' || docFolderName === currentFolder;
    const matchesSearch = doc.fileName.toLowerCase().includes(currentSearch.toLowerCase());
    const matchesType = currentTypeFilter === 'all' || doc.fileType === currentTypeFilter;
    return matchesFolder && matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalFiles = documents.length;
  const totalBytes = documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
  const totalFoldersCount = folders.length;

  return (
    <div>
      <header className="header">
        <div className="header-left">
          <div className="logo-box">
            <span>V</span>
          </div>
          <div className="brand-text">
            <h1>VaultAI</h1>
            <p>Personal file vault</p>
          </div>
        </div>

        <div className="header-right">
          <button id="addFolderBtn" className="btn btn-outline" onClick={handleAddFolder}>
            + Folder
          </button>
          <div className="user-block">
            <span id="userNameTag" className="user-name-tag">
              {user ? user.name : ''}
            </span>
            <button
              id="avatarBtn"
              className="avatar"
              title="Log out"
              onClick={handleLogout}
            >
              {getInitials(user ? user.name : '')}
            </button>
          </div>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          <p className="sidebar-title">Folders</p>
          <ul id="folderList" className="folder-list">
            <li
              className={`folder-item ${currentFolder === 'All Files' ? 'active' : ''}`}
              onClick={() => setCurrentFolder('All Files')}
            >
              <div className="folder-item-left">
                <span className="folder-dot dot-all"></span>
                <span>All Files</span>
              </div>
            </li>
            {folders.map((folder, index) => {
              const dotClasses = ['dot-college', 'dot-projects', 'dot-personal'];
              const dotClass = dotClasses[index % dotClasses.length];
              return (
                <li
                  key={folder._id}
                  className={`folder-item ${currentFolder === folder.name ? 'active' : ''}`}
                  onClick={() => setCurrentFolder(folder.name)}
                >
                  <div className="folder-item-left">
                    <span className={`folder-dot ${dotClass}`}></span>
                    <span>{folder.name}</span>
                  </div>
                  <div className="folder-actions">
                    <button
                      className="folder-action-btn"
                      title="Rename"
                      onClick={(e) => handleRenameFolder(folder, e)}
                    >
                      ✏️
                    </button>
                    <button
                      className="folder-action-btn delete"
                      title="Delete"
                      onClick={(e) => handleDeleteFolder(folder, e)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button id="addFolderBtnSide" className="add-folder-link" onClick={handleAddFolder}>
            + Add folder
          </button>
        </aside>

        <main className="main-content">
          <section className="hero">
            <div className="hero-pattern"></div>
            <div className="hero-text">
              <span className="hero-eyebrow">Your vault</span>
              <h2>Keep your files in one place.</h2>
              <p>Upload, organize and find your documents easily.</p>
            </div>
            <div className="hero-action">
              <button
                id="uploadBtn"
                className="btn btn-primary"
                onClick={() => setShowUploadModal(true)}
              >
                + Upload files
              </button>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card stat-a">
              <p className="stat-label">Total Files</p>
              <h3 id="statTotalFiles">{totalFiles}</h3>
            </div>
            <div className="stat-card stat-b">
              <p className="stat-label">Folders</p>
              <h3 id="statFolders">{totalFoldersCount}</h3>
            </div>
            <div className="stat-card stat-c">
              <p className="stat-label">Storage Used</p>
              <h3 id="statStorage">{formatSize(totalBytes)}</h3>
            </div>
          </section>

          <section className="search-bar">
            <input
              type="text"
              id="searchInput"
              placeholder="Search your files..."
              value={currentSearch}
              onChange={(e) => setCurrentSearch(e.target.value)}
            />
            <select
              id="typeFilter"
              value={currentTypeFilter}
              onChange={(e) => setCurrentTypeFilter(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
              <option value="image">Image</option>
              <option value="other">Other</option>
            </select>
          </section>

          <section className="files-section">
            <div className="files-header">
              <h3 id="filesHeading">{currentFolder}</h3>
              <span id="fileCountTag" className="file-count-tag">
                {filteredDocuments.length} {filteredDocuments.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            <div id="fileListWrapper">
              {loadingDocs ? (
                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-sub)' }}>
                  Loading documents...
                </p>
              ) : (
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Folder</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="fileTableBody">
                    {filteredDocuments.map((file) => (
                      <tr key={file._id}>
                        <td>
                          <div className="file-name-cell">
                            <div className={`file-icon type-${file.fileType}`}>
                              {fileIconLabel(file.fileType)}
                            </div>
                            <span className="file-name">{file.fileName}</span>
                          </div>
                        </td>
                        <td>{file.folderId ? file.folderId.name : 'All Files'}</td>
                        <td>{formatSize(file.fileSize)}</td>
                        <td>
                          <div className="file-actions">
                            <a
                              href={file.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-small action-open"
                            >
                              Open
                            </a>
                            <button
                              className="btn btn-small action-delete"
                              onClick={() => handleDeleteDocument(file._id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!loadingDocs && filteredDocuments.length === 0 && (
                <p id="emptyState" className="empty-state">
                  No files found. Try uploading something.
                </p>
              )}
            </div>
          </section>

          <section className="ai-section">
            <h3>AI Assistance</h3>
            <p className="ai-sub">Ask about a selected document</p>
            <div className="ai-controls">
              <select
                id="aiFileSelect"
                value={selectedAiFile}
                onChange={(e) => setSelectedAiFile(e.target.value)}
              >
                <option value="">Select a file</option>
                {documents.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.fileName}
                  </option>
                ))}
              </select>
              <button
                id="summarizeBtn"
                className="btn btn-outline"
                onClick={() => {
                  if (!selectedAiFile) {
                    setAiResponse('Select a file first.');
                    return;
                  }
                  const file = documents.find((f) => f._id === selectedAiFile);
                  setAiResponse(`The backend AI module will summarize "${file ? file.fileName : ''}" here.`);
                }}
              >
                Summarize
              </button>
              <button
                id="askAiBtn"
                className="btn btn-outline"
                onClick={() => {
                  if (!selectedAiFile) {
                    setAiResponse('Select a file first.');
                    return;
                  }
                  const file = documents.find((f) => f._id === selectedAiFile);
                  setAiResponse(`The backend AI module will answer questions about "${file ? file.fileName : ''}" here.`);
                }}
              >
                Ask AI
              </button>
            </div>
            {aiResponse && (
              <div id="aiResponseBox" className="ai-response">
                {aiResponse}
              </div>
            )}
            <p className="ai-note">AI requests will be handled securely through the backend.</p>
          </section>
        </main>
      </div>

      <Upload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        folders={folders}
        currentFolder={currentFolder}
        onUploadSuccess={loadDocuments}
        showToast={showToast}
      />

      <div className={`toast ${toastShow ? 'show' : ''}`}>{toastMsg}</div>
    </div>
  );
};

export default Documents;
