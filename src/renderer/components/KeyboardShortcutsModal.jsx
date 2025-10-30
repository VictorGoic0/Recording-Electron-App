import React from "react";
import "./KeyboardShortcutsModal.css";

/**
 * Keyboard Shortcuts Modal Component
 * Displays all available keyboard shortcuts in the app
 */
function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      key: "Spacebar",
      description: "Play / Pause video"
    },
    {
      key: "Delete or Backspace",
      description: "Delete selected clip from timeline"
    },
    {
      key: "Ctrl+K (Cmd+K on Mac)",
      description: "Split clip at playhead position"
    },
    {
      key: "Left Arrow",
      description: "Skip backward 10 seconds"
    },
    {
      key: "Right Arrow",
      description: "Skip forward 10 seconds"
    },
    {
      key: "Up Arrow",
      description: "Increase volume by 10%"
    },
    {
      key: "Down Arrow",
      description: "Decrease volume by 10%"
    }
  ];

  return (
    <div className="keyboard-shortcuts-modal-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="keyboard-shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="keyboard-shortcuts-content">
          <div className="shortcuts-list">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <div className="shortcut-key">{shortcut.key}</div>
                <div className="shortcut-description">{shortcut.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="keyboard-shortcuts-footer">
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;

