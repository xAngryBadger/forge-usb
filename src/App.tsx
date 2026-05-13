import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { DeviceSelector } from './components/DeviceSelector'
import { IsoSelector } from './components/IsoSelector'
import { WritePanel } from './components/WritePanel'
import type { UsbDevice, IsoInfo, WriteStatus } from './types'
import { useState, useEffect, useCallback } from 'react'

function App() {
  const [devices, setDevices] = useState<UsbDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<UsbDevice | null>(null)
  const [isos, setIsos] = useState<IsoInfo[]>([])
  const [selectedIso, setSelectedIso] = useState<IsoInfo | null>(null)
  const [status, setStatus] = useState<WriteStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      const result = await invoke<UsbDevice[]>('list_usb_devices')
      setDevices(result)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      try {
        const result = await invoke<UsbDevice[]>('list_usb_devices')
        if (mounted) setDevices(result)
      } catch { /* ignore */ }
      try {
        const home = await invoke<string>('get_home_dir')
        if (mounted) {
          const isoResult = await invoke<IsoInfo[]>('list_iso_files', { directory: home + '/Downloads' })
          if (mounted) setIsos(isoResult)
        }
      } catch { /* ignore */ }
    }
    init()
    return () => { mounted = false }
  }, [])

  const handleBrowse = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'ISO Images', extensions: ['iso', 'img'] }],
    })
    if (selected) {
      const path = typeof selected === 'string' ? selected : Array.isArray(selected) ? selected[0] : null
      if (!path) return
      try {
        const stat = await invoke<IsoInfo[]>('list_iso_files', {
          directory: path.substring(0, path.lastIndexOf('/')) || '/',
        })
        const match = stat.find((i) => i.path === path)
        if (match) setSelectedIso(match)
        else setSelectedIso({ path, size_bytes: 0, label: null })
      } catch {
        setSelectedIso({ path, size_bytes: 0, label: null })
      }
    }
  }, [])

  const handleWrite = useCallback(async () => {
    if (!selectedIso || !selectedDevice) return

    setStatus('unmounting')
    setError(null)

    try {
      await invoke<boolean>('unmount_device', { device: selectedDevice.device })
      setStatus('writing')

      const result = await invoke<boolean>('write_iso_to_device', {
        isoPath: selectedIso.path,
        device: selectedDevice.device,
      })

      if (result) {
        setStatus('done')
      } else {
        setStatus('error')
        setError('Write failed')
      }
    } catch (e) {
      setStatus('error')
      setError(String(e))
    }
  }, [selectedIso, selectedDevice])

  const canWrite = selectedIso !== null && selectedDevice !== null && status !== 'writing' && status !== 'unmounting'

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--amber)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-bold" style={{ color: 'var(--text)' }}>ForgeUSB</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Bootable USB Maker</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <IsoSelector
            isos={isos}
            selected={selectedIso}
            onSelect={setSelectedIso}
            onBrowse={handleBrowse}
          />
          <DeviceSelector
            devices={devices}
            selected={selectedDevice}
            onSelect={setSelectedDevice}
            onRefresh={refreshDevices}
          />
        </div>

        <WritePanel
          status={status}
          error={error}
          onWrite={handleWrite}
          canWrite={canWrite}
        />
      </div>

      <div className="px-4 py-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
        Requires sudo for device write access. Data on selected USB will be erased.
      </div>
    </div>
  )
}

export default App
