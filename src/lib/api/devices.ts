import { authFetch } from './client'

export interface Device {
  id: string
  device_id: string
  coach_id: string
  label: string | null
  created_at: string
}

export async function listMyDevices(): Promise<Device[]> {
  const res = await authFetch('/coach/devices')
  return res.json()
}

export async function pairDevice(deviceId: string, label?: string): Promise<Device> {
  const res = await authFetch('/coach/devices', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, label: label || null }),
  })
  return res.json()
}

export async function unpairDevice(deviceRowId: string): Promise<void> {
  await authFetch(`/coach/devices/${deviceRowId}`, { method: 'DELETE' })
}
