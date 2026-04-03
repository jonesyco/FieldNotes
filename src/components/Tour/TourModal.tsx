import { useState } from 'react';
import './TourModal.css';

const TOUR_KEY = 'fieldnotes_tour_seen';

const STEPS = [
  {
    icon: '⌖',
    label: '01 / 04',
    title: 'Welcome to FieldNotes',
    content: (
      <div className="tour-welcome">
        <div className="tour-app-name">FieldNotes</div>
        <p className="tour-lead">
          Your personal field journal for the world — a living, shareable record of
          every place that matters to you.
        </p>
        <p className="tour-body-text">
          Drop pins anywhere on the globe, tag them by category, search and filter
          your collection, and share curated maps with anyone — no account required.
          Your data lives in your browser and travels with a single link.
        </p>
        <p className="tour-body-text">
          Whether you're mapping neighborhood coffee spots, scouting film locations,
          planning a road trip, or cataloging hidden gems in your city — FieldNotes
          turns your curiosity into a map worth sharing.
        </p>
        <div className="tour-callout">
          This quick tour covers the four things you need to know to get started.
        </div>
      </div>
    ),
  },
  {
    icon: '◎',
    label: '02 / 04',
    title: 'Navigating the Map',
    content: (
      <div className="tour-nav-content">
        <p className="tour-body-text">
          FieldNotes uses a full-screen interactive map. Here's how to move around:
        </p>
        <div className="tour-controls-grid">
          <div className="tour-ctrl-row">
            <div className="tour-ctrl-keys">
              <span className="tour-mouse-icon">🖱</span> drag
            </div>
            <div className="tour-ctrl-label">
              <strong>Pan</strong> — click and drag to move the map in any direction
            </div>
          </div>
          <div className="tour-ctrl-row">
            <div className="tour-ctrl-keys">scroll</div>
            <div className="tour-ctrl-label">
              <strong>Zoom</strong> — scroll wheel zooms in and out; pinch on trackpad
            </div>
          </div>
          <div className="tour-ctrl-row">
            <div className="tour-ctrl-keys">
              <kbd>right-click</kbd> drag
            </div>
            <div className="tour-ctrl-label">
              <strong>Rotate</strong> — right-click and drag left/right to spin the map
            </div>
          </div>
          <div className="tour-ctrl-row">
            <div className="tour-ctrl-keys">
              <kbd>Ctrl</kbd> drag
            </div>
            <div className="tour-ctrl-label">
              <strong>Tilt &amp; rotate</strong> — hold Ctrl and drag to pitch the camera into 3D perspective
            </div>
          </div>
          <div className="tour-ctrl-row">
            <div className="tour-ctrl-keys">
              <span className="tour-btn-ref">⌂</span>
            </div>
            <div className="tour-ctrl-label">
              <strong>Home</strong> — click the Home button in the map controls to fly back to your current location
            </div>
          </div>
        </div>
        <div className="tour-callout">
          Tip: enable <strong>3D Buildings</strong> or <strong>3D Terrain</strong> in the map controls, then use Ctrl + drag to explore from a cinematic angle.
        </div>
      </div>
    ),
  },
  {
    icon: '◈',
    label: '03 / 04',
    title: 'Pins — Add, Edit & Delete',
    content: (
      <div className="tour-pins-content">
        <p className="tour-body-text">
          Pins are the heart of FieldNotes. Each pin stores a title, category,
          description, tags, neighborhood, photo, and website link.
        </p>
        <div className="tour-action-list">
          <div className="tour-action-row">
            <span className="tour-action-badge tour-action-add">+ ADD</span>
            <span className="tour-action-desc">
              Click <strong>+ ADD</strong> in the sidebar, then click any spot on
              the map to place your pin. A form opens to fill in the details.
            </span>
          </div>
          <div className="tour-action-row">
            <span className="tour-action-badge tour-action-edit">✎ EDIT</span>
            <span className="tour-action-desc">
              Click any pin on the map or any item in the sidebar list to open its
              detail panel — then click <strong>✎ EDIT</strong> to update it.
            </span>
          </div>
          <div className="tour-action-row">
            <span className="tour-action-badge tour-action-move">✦ MOVE</span>
            <span className="tour-action-desc">
              From a pin's detail panel, click <strong>✦ MOVE</strong> then click
              the new location on the map.
            </span>
          </div>
          <div className="tour-action-row">
            <span className="tour-action-badge tour-action-delete">✕ DELETE</span>
            <span className="tour-action-desc">
              From a pin's detail panel, click <strong>✕ DELETE</strong>. You'll
              be asked to confirm before anything is removed.
            </span>
          </div>
          <div className="tour-action-row">
            <span className="tour-action-badge tour-action-fav">★ FAV</span>
            <span className="tour-action-desc">
              Star any pin to mark it as a favorite — then filter the list to show
              only your favorites.
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: '↗',
    label: '04 / 04',
    title: 'Sharing Your Map',
    content: (
      <div className="tour-share-content">
        <p className="tour-body-text">
          Built something worth sharing? Send your whole map to anyone with a
          single link.
        </p>
        <div className="tour-share-steps">
          <div className="tour-share-step">
            <div className="tour-share-num">1</div>
            <div className="tour-share-text">
              Click <span className="tour-btn-ref">↗ SHARE</span> at the top of the
              sidebar. FieldNotes saves your map to the cloud.
            </div>
          </div>
          <div className="tour-share-step">
            <div className="tour-share-num">2</div>
            <div className="tour-share-text">
              A unique link appears — copy it and send it to anyone.
            </div>
          </div>
          <div className="tour-share-step">
            <div className="tour-share-num">3</div>
            <div className="tour-share-text">
              Recipients get a <strong>read-only view</strong>: they can explore,
              filter, and export your pins, but can't change your original.
            </div>
          </div>
          <div className="tour-share-step">
            <div className="tour-share-num">4</div>
            <div className="tour-share-text">
              They can click <strong>OPEN IN EDITOR</strong> to fork a personal
              copy of the map and start building from there.
            </div>
          </div>
        </div>
        <div className="tour-callout">
          You can also export your pins as JSON and import them elsewhere — great
          for offline use or backups.
        </div>
      </div>
    ),
  },
];

export default function TourModal() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => !localStorage.getItem(TOUR_KEY));

  if (!visible) return null;

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) dismiss();
  };

  return (
    <div className="modal-overlay tour-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-dialog">

        {/* Step tag + skip */}
        <div className="tour-topbar">
          <span className="tour-step-label">{current.label}</span>
          <button className="tour-skip" onClick={dismiss} aria-label="Skip tour">
            SKIP TOUR
          </button>
        </div>

        {/* Hero */}
        <div className="tour-hero">
          <div className="tour-hero-icon">{current.icon}</div>
          <h2 className="tour-title" id="tour-title">{current.title}</h2>
        </div>

        {/* Content */}
        <div className="tour-content">
          {current.content}
        </div>

        {/* Footer nav */}
        <div className="tour-footer">
          <div className="tour-dots" aria-label="Tour progress">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`tour-dot${i === step ? ' tour-dot--active' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                aria-current={i === step ? 'step' : undefined}
              />
            ))}
          </div>
          <div className="tour-nav-btns">
            {!isFirst && (
              <button className="tour-btn tour-btn--secondary" onClick={() => setStep(s => s - 1)}>
                ← BACK
              </button>
            )}
            {isLast ? (
              <button className="tour-btn tour-btn--primary" onClick={dismiss}>
                START EXPLORING →
              </button>
            ) : (
              <button className="tour-btn tour-btn--primary" onClick={() => setStep(s => s + 1)}>
                NEXT →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
