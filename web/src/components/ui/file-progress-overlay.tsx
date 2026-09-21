import React from 'react';
import ReactDOM from 'react-dom';
import { Loader2 } from 'lucide-react';

interface FileProgressOverlayProps {
  /** Whether the overlay is visible. */
  isVisible: boolean;
  /**
   * Progress from 0 to 100.
   * Pass -1 (or any negative number) for indeterminate mode — the bar shows a
   * shimmer animation instead of a fill.
   */
  progress: number;
  /** Short description shown below the spinner, e.g. "Downloading..." */
  label?: string;
}

/**
 * Full-screen overlay displayed during long-running file operations (upload,
 * download, preview fetch). Renders into document.body via a Portal so it
 * always sits above Radix UI / shadcn Dialog portals regardless of z-index
 * stacking contexts in the component tree.
 */
const FileProgressOverlay: React.FC<FileProgressOverlayProps> = ({
  isVisible,
  progress,
  label = 'Loading...',
}) => {
  if (!isVisible) return null;

  const isIndeterminate = progress < 0;
  const pct = isIndeterminate ? 0 : Math.min(100, Math.round(progress));

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="flex flex-col items-center gap-5 rounded-2xl bg-white px-10 py-8 shadow-2xl"
        style={{ minWidth: '260px', maxWidth: '340px', width: '90%' }}
      >
        {/* Spinner */}
        <Loader2
          className="h-10 w-10 animate-spin"
          strokeWidth={2.2}
          style={{ color: '#FEC105' }}
        />

        {/* Label */}
        <p className="text-center text-sm font-semibold leading-snug" style={{ color: '#111827' }}>
          {label}
        </p>

        {/* Progress bar + percentage */}
        <div className="w-full space-y-2">
          {/* Track */}
          <div
            className="relative w-full overflow-hidden rounded-full"
            style={{ height: '8px', backgroundColor: '#e5e7eb' }}
          >
            {isIndeterminate ? (
              /* Shimmer stripe for indeterminate state */
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  width: '40%',
                  backgroundColor: '#FEC105',
                  animation: 'file-progress-shimmer 1.4s ease-in-out infinite',
                }}
              />
            ) : (
              /* Determinate fill */
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: '#FEC105',
                  transition: 'width 0.25s ease-out',
                }}
              />
            )}
          </div>

          <p
            className="text-center text-xs font-medium tabular-nums"
            style={{ color: '#6b7280' }}
          >
            {isIndeterminate ? 'Please wait…' : `${pct}%`}
          </p>
        </div>
      </div>

      {/* Keyframes injected once alongside the portal */}
      <style>{`
        @keyframes file-progress-shimmer {
          0%   { left: -45%; }
          100% { left: 105%; }
        }
      `}</style>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
};

export default FileProgressOverlay;
