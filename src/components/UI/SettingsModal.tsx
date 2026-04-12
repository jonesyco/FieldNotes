import { useMemo } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { collectTagsFromPois } from '../../utils/tags';
import './SettingsModal.css';

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
    onExport: () => void;
    onImport: () => void;
}

export default function SettingsModal({ open, onClose, onExport, onImport }: SettingsModalProps) {
    const { pois, isReadOnly, sequenceEnabled, setSequenceEnabled } =
        usePOIStore();
    const allTags = useMemo(() => collectTagsFromPois(pois), [pois]);

    if (!open) return null;

    return (
        <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="modal-dialog settings-modal">
                <div className="modal-header">
                    <h3 className="modal-title">⚙ SETTINGS</h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="settings-content">
                    {isReadOnly && (
                        <div className="readonly-notice">
                            Editing settings are read-only for shared collections
                        </div>
                    )}

                    <div className="settings-section">
                        <h4 className="settings-section-title">MAP SETTINGS</h4>
                        <div className="settings-option-list">
                            <label className="settings-option">
                                <div className="settings-option-copy">
                                    <span className="settings-option-title">↝ SEQUENCE MAP</span>
                                    <span className="settings-option-description">
                                        Connect included locations in their saved order.
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={sequenceEnabled}
                                    onChange={(event) => setSequenceEnabled(event.target.checked)}
                                    disabled={isReadOnly}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h4 className="settings-section-title">DATA</h4>
                        <div className="settings-option-list">
                            <div className="settings-option settings-option--actions">
                                <div className="settings-option-copy">
                                    <span className="settings-option-title">EXPORT LOCATIONS</span>
                                    <span className="settings-option-description">
                                        Download the current map as JSON.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-action btn-secondary settings-action-button"
                                    onClick={onExport}
                                >
                                    ↓ EXPORT
                                </button>
                            </div>
                            <div className="settings-option settings-option--actions">
                                <div className="settings-option-copy">
                                    <span className="settings-option-title">IMPORT LOCATIONS</span>
                                    <span className="settings-option-description">
                                        Add locations from a JSON file into this map.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-action btn-secondary settings-action-button"
                                    onClick={onImport}
                                    disabled={isReadOnly}
                                >
                                    ↑ IMPORT
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h4 className="settings-section-title">TAGS ON THIS MAP</h4>
                        {allTags.length === 0 ? (
                            <p className="empty-message">No tags on this map yet</p>
                        ) : (
                            <div className="settings-tag-list">
                                {allTags.map((tag) => (
                                    <span key={tag} className="tag-chip tag-chip--large">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-action btn-secondary" onClick={onClose}>
                        CLOSE
                    </button>
                </div>
            </div>
        </div>
    );
}
