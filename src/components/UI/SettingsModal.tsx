import { useState } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { PREDEFINED_CATEGORIES } from '../../types/categories';
import type { CategoryId } from '../../types/categories';
import './SettingsModal.css';

interface SettingsModalProps {
    open: boolean;
    onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
    const { activeCategories, addCategory, updateCategory, deleteCategory, pois, isReadOnly } =
        usePOIStore();

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#666666');
    const [editingId, setEditingId] = useState<CategoryId | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<CategoryId | null>(null);

    const customCategories = activeCategories.filter((c) => !c.isPredefined);
    const predefinedIds = new Set(activeCategories.map((c) => c.id));

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) {
            alert('Category name cannot be empty');
            return;
        }

        // Check for duplicate names
        if (
            activeCategories.some(
                (c) => c.name.toLowerCase() === newCategoryName.trim().toLowerCase()
            )
        ) {
            alert('A category with this name already exists');
            return;
        }

        addCategory(newCategoryName.trim(), newCategoryColor);
        setNewCategoryName('');
        setNewCategoryColor('#666666');
    };

    const handleStartEdit = (id: CategoryId) => {
        const cat = activeCategories.find((c) => c.id === id);
        if (cat) {
            setEditingId(id);
            setEditName(cat.name);
            setEditColor(cat.color);
        }
    };

    const handleSaveEdit = () => {
        if (!editName.trim()) {
            alert('Category name cannot be empty');
            return;
        }

        // Check for duplicate names (excluding self)
        if (
            activeCategories.some(
                (c) =>
                    c.id !== editingId &&
                    c.name.toLowerCase() === editName.trim().toLowerCase()
            )
        ) {
            alert('A category with this name already exists');
            return;
        }

        if (editingId) {
            updateCategory(editingId, editName.trim(), editColor);
            setEditingId(null);
        }
    };

    const handleDeleteCategory = (id: CategoryId) => {
        if (id === 'other') {
            alert('Cannot delete the "Other" category');
            return;
        }

        const poisInCategory = pois.filter((p) => p.category === id);
        if (poisInCategory.length > 0) {
            alert(
                `${poisInCategory.length} POI(s) with this category will be reassigned to "Other"`
            );
        }

        deleteCategory(id);
        setShowDeleteConfirm(null);
    };

    const handleReenableCategory = (id: CategoryId) => {
        const cat = PREDEFINED_CATEGORIES.find((c) => c.id === id);
        if (cat) {
            addCategory(cat.name, cat.color);
        }
    };

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
                    <h3 className="modal-title">⚙ CATEGORY SETTINGS</h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="settings-content">
                    {isReadOnly && (
                        <div className="readonly-notice">
                            Category settings are read-only for shared collections
                        </div>
                    )}

                    {/* Predefined Categories Section */}
                    <div className="settings-section">
                        <h4 className="settings-section-title">PREDEFINED CATEGORIES</h4>
                        <div className="categories-list">
                            {PREDEFINED_CATEGORIES.map((cat) => {
                                const isActive = predefinedIds.has(cat.id);
                                return (
                                    <div key={cat.id} className="category-item predefined-category">
                                        <div
                                            className="category-color"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        <span className="category-name">{cat.name}</span>
                                        <button
                                            className={`category-toggle ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                                if (isActive) {
                                                    // Disable
                                                    if (cat.id !== 'other') {
                                                        deleteCategory(cat.id);
                                                    }
                                                } else {
                                                    // Re-enable
                                                    handleReenableCategory(cat.id);
                                                }
                                            }}
                                            disabled={isReadOnly || (cat.id === 'other' && isActive)}
                                            title={
                                                cat.id === 'other' && isActive
                                                    ? 'Cannot disable "Other" category'
                                                    : isActive
                                                        ? 'Disable'
                                                        : 'Enable'
                                            }
                                        >
                                            {isActive ? '✓' : '+'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Categories Section */}
                    <div className="settings-section">
                        <h4 className="settings-section-title">CUSTOM CATEGORIES</h4>

                        {!isReadOnly && (
                            <div className="add-category-form">
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddCategory();
                                    }}
                                    placeholder="Category name"
                                    disabled={isReadOnly}
                                />
                                <div className="color-picker-group">
                                    <input
                                        type="color"
                                        className="form-color"
                                        value={newCategoryColor}
                                        onChange={(e) => setNewCategoryColor(e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                    <button
                                        className="btn-action btn-add"
                                        onClick={handleAddCategory}
                                        disabled={isReadOnly}
                                    >
                                        ADD
                                    </button>
                                </div>
                            </div>
                        )}

                        {customCategories.length === 0 ? (
                            <p className="empty-message">No custom categories yet</p>
                        ) : (
                            <div className="categories-list">
                                {customCategories.map((cat) => (
                                    <div key={cat.id} className="category-item custom-category">
                                        {editingId === cat.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    className="form-input edit-name"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit();
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    autoFocus
                                                />
                                                <input
                                                    type="color"
                                                    className="form-color"
                                                    value={editColor}
                                                    onChange={(e) => setEditColor(e.target.value)}
                                                />
                                                <button
                                                    className="btn-action btn-secondary"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    ✕
                                                </button>
                                                <button
                                                    className="btn-action btn-add"
                                                    onClick={handleSaveEdit}
                                                >
                                                    ✓
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    className="category-color"
                                                    style={{ backgroundColor: cat.color }}
                                                />
                                                <span className="category-name">{cat.name}</span>
                                                <button
                                                    className="btn-action btn-secondary"
                                                    onClick={() => handleStartEdit(cat.id)}
                                                    disabled={isReadOnly}
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    className="btn-action btn-danger"
                                                    onClick={() => setShowDeleteConfirm(cat.id)}
                                                    disabled={isReadOnly}
                                                >
                                                    ✕
                                                </button>
                                                {showDeleteConfirm === cat.id && (
                                                    <div className="delete-confirm">
                                                        <p>Delete this category?</p>
                                                        <button
                                                            className="btn-action btn-secondary"
                                                            onClick={() => setShowDeleteConfirm(null)}
                                                        >
                                                            CANCEL
                                                        </button>
                                                        <button
                                                            className="btn-action btn-danger"
                                                            onClick={() => handleDeleteCategory(cat.id)}
                                                        >
                                                            DELETE
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
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
