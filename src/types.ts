export interface UsbDevice {
  device: string
  vendor: string
  model: string
  size_bytes: number
  mountpoints: string[]
  removable: boolean
}

export interface IsoInfo {
  path: string
  size_bytes: number
  label: string | null
}

export type WriteStatus = 'idle' | 'unmounting' | 'writing' | 'done' | 'error'
