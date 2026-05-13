import type { WriteStatus } from '../types'

interface WritePanelProps {
  status: WriteStatus
  error: string | null
  onWrite: () => void
  canWrite: boolean
}

const statusLabels: Record<WriteStatus, string> = {
  idle: 'Ready',
  unmounting: 'Unmounting device...',
  writing: 'Writing image...',
  done: 'Write complete!',
  error: 'Error',
}

const statusColors: Record<WriteStatus, string> = {
  idle: 'var(--text-3)',
  unmounting: 'var(--amber)',
  writing: 'var(--amber)',
  done: 'var(--green)',
  error: 'var(--red)',
}

export function WritePanel({ status, error, onWrite, canWrite }: WritePanelProps) {
  const isWriting = status === 'writing' || status === 'unmounting'

  return (
    <div
      className="rounded-lg p-4 border"
      style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)' }}
    >
      <h2 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-2)' }}>Write</h2>

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: statusColors[status],
            boxShadow: status === 'writing' || status === 'unmounting' ? `0 0 6px ${statusColors[status]}` : 'none',
            animation: isWriting ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span className="text-sm" style={{ color: statusColors[status] }}>
          {statusLabels[status]}
        </span>
      </div>

      {error && (
        <div
          className="text-xs px-3 py-2 rounded mb-3"
          style={{ background: 'var(--red-dim)', color: 'var(--red)' }}
        >
          {error}
        </div>
      )}

      {status === 'done' && (
        <div
          className="text-xs px-3 py-2 rounded mb-3"
          style={{ background: 'var(--green-dim)', color: 'var(--green)' }}
        >
          Bootable USB created successfully. You can safely eject the device.
        </div>
      )}

      <button
        onClick={onWrite}
        disabled={!canWrite || isWriting}
        className="w-full py-2.5 rounded font-medium text-sm transition-all"
        style={{
          background: canWrite && !isWriting ? 'var(--amber)' : 'var(--bg-surface)',
          color: canWrite && !isWriting ? '#fff' : 'var(--text-3)',
          cursor: canWrite && !isWriting ? 'pointer' : 'not-allowed',
          border: canWrite && !isWriting ? 'none' : '1px solid var(--border)',
        }}
      >
        {isWriting ? 'Writing...' : 'Write to USB'}
      </button>

      {!canWrite && status === 'idle' && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-3)' }}>
          Select an ISO and a USB device to begin
        </p>
      )}
    </div>
  )
}
