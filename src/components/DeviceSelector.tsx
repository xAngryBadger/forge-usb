import { formatBytes } from '../lib/utils'
import type { UsbDevice } from '../types'

interface DeviceSelectorProps {
  devices: UsbDevice[]
  selected: UsbDevice | null
  onSelect: (device: UsbDevice) => void
  onRefresh: () => void
}

export function DeviceSelector({ devices, selected, onSelect, onRefresh }: DeviceSelectorProps) {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{ background: 'var(--bg-alt)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>USB Devices</h2>
        <button
          onClick={onRefresh}
          className="text-xs px-2 py-0.5 rounded border transition-colors hover:brightness-125"
          style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
        >
          Refresh
        </button>
      </div>

      {devices.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-3)' }}>
          No removable devices found. Insert a USB drive and refresh.
        </p>
      ) : (
        <div className="space-y-1.5">
          {devices.map((dev) => {
            const isSelected = selected?.device === dev.device
            return (
              <button
                key={dev.device}
                onClick={() => onSelect(dev)}
                className="w-full text-left px-3 py-2 rounded transition-colors"
                style={{
                  background: isSelected ? 'var(--amber-dim)' : 'transparent',
                  border: isSelected ? '1px solid var(--amber)' : '1px solid transparent',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {dev.model || dev.device}
                    </span>
                    {dev.vendor && (
                      <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>
                        {dev.vendor}
                      </span>
                    )}
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-2)' }}>
                    {formatBytes(dev.size_bytes)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {dev.device}
                  </span>
                  {dev.mountpoints.length > 0 && (
                    <span className="text-xs" style={{ color: 'var(--amber)' }}>
                      mounted: {dev.mountpoints.join(', ')}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
