import { formatBytes } from '../lib/utils'
import type { IsoInfo } from '../types'

interface IsoSelectorProps {
  isos: IsoInfo[]
  selected: IsoInfo | null
  onSelect: (iso: IsoInfo) => void
  onBrowse: () => void
}

export function IsoSelector({ isos, selected, onSelect, onBrowse }: IsoSelectorProps) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>ISO Image</h2>
        <button
          onClick={onBrowse}
          className="text-xs px-2 py-0.5 rounded border transition-colors hover:brightness-125"
          style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
        >
          Browse...
        </button>
      </div>

      {selected ? (
        <div
          className="px-3 py-2 rounded"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--amber)' }}
        >
          <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {selected.path.split('/').pop()}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs truncate max-w-64" style={{ color: 'var(--text-3)' }}>
              {selected.path}
            </span>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-2)' }}>
              {formatBytes(selected.size_bytes)}
            </span>
          </div>
        </div>
      ) : isos.length > 0 ? (
        <div className="space-y-1.5">
          {isos.map((iso) => {
            const isSelected = false
            return (
              <button
                key={iso.path}
                onClick={() => onSelect(iso)}
                className="w-full text-left px-3 py-2 rounded transition-colors"
                style={{
                  background: isSelected ? 'var(--amber-dim)' : 'var(--bg-surface)',
                  border: isSelected ? '1px solid var(--amber)' : '1px solid transparent',
                }}
              >
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                  {iso.path.split('/').pop()}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs truncate max-w-48" style={{ color: 'var(--text-3)' }}>
                    {iso.path}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-2)' }}>
                    {formatBytes(iso.size_bytes)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-3)' }}>
          No ISO files found. Click Browse to select one.
        </p>
      )}
    </div>
  )
}
