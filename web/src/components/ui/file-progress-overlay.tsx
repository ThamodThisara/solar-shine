import React from 'react';
import ReactDOM from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FileProgressOverlayProps {
  /** Whether the overlay is visible. */
  isVisible: boolean;
  /** Progress from 0 to 100. Pass -1 for indeterminate (spinner only). */
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
  const displayPercent = isIndeterminate ? null : Math.min(100, Math.round(progress));

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
          className="h-10 w-10 animate-spin text-primary"
          strokeWidth={2.2}
        />

        {/* Label */}
        <p className="text-center text-sm font-semibold text-foreground leading-snug">
          {label}
        </p>

        {/* Progress bar + percentage */}
        <div className="w-full space-y-2">
          <Progress
            value={isIndeterminate ? undefined : displayPercent ?? 0}
            className="h-2"
          />
          <p className="text-center text-xs font-medium text-muted-foreground tabular-nums">
            {isIndeterminate ? 'Please wait…' : `${displayPercent}%`}
          </p>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
};

export default FileProgressOverlay;

