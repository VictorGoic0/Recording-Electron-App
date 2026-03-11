import React, { useState, useEffect } from "react";
import "./App.css";
import MediaLibrary from "./components/MediaLibrary/MediaLibrary";
import VideoPlayer from "./components/VideoPlayer/VideoPlayer";
import Timeline from "./components/Timeline/Timeline";
import Toast from "./components/Toast/Toast";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal/KeyboardShortcutsModal";
import { v4 as uuidv4 } from "uuid";
import { useImport } from "./hooks/useImport";

function App() {
  const [toasts, setToasts] = useState([]);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const showToast = (message, type = "info") => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const { handleImport, processImportedFiles, isProcessing } = useImport(showToast);

  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("dragover", preventDefaults);
    document.addEventListener("drop", preventDefaults);
    return () => {
      document.removeEventListener("dragover", preventDefaults);
      document.removeEventListener("drop", preventDefaults);
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1>ClipForge</h1>
          <span className="version">v1.0.0</span>
          {isProcessing && (
            <span className="processing-indicator">
              ⏳ Processing videos...
            </span>
          )}
        </div>
        <div className="header-right">
          <button 
            className="btn-secondary btn-small" 
            onClick={() => setShowKeyboardShortcuts(true)}
            title="Keyboard Shortcuts"
          >
            Help
          </button>
        </div>
      </header>

      <div className="main-content">
        <div className="top-section">
          {/* Media Library - Left Panel */}
          <MediaLibrary
            onImport={handleImport}
            onProcessFiles={processImportedFiles}
            isProcessing={isProcessing}
          />

          {/* Video Preview - Center Panel */}
          <VideoPlayer onShowToast={showToast} />
        </div>

        {/* Timeline - Bottom Panel */}
        <section className="timeline">
          <Timeline />
        </section>
      </div>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
}

export default App;
