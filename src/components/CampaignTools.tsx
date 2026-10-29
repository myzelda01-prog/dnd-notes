import { useEffect, useRef, useState } from 'react'
import { createCampaign, deleteCampaign, exportCampaign, importBackup, renameCampaign } from '../lib/db'
import type { Campaign } from '../lib/types'

interface Props {
  campaign: Campaign
  onSwitch: (id: string | null) => void
}

export function CampaignTools({ campaign, onSwitch }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(campaign.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!confirmDelete) return
    const timer = setTimeout(() => setConfirmDelete(false), 4000)
    return () => clearTimeout(timer)
  }, [confirmDelete])

  const download = async () => {
    const { filename, json } = await exportCampaign(campaign.id)
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setMessage(`Saved ${filename}`)
  }

  const upload = async (file: File) => {
    try {
      const imported = await importBackup(await file.text())
      setMessage(`Imported "${imported.name}"`)
      onSwitch(imported.id)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed.')
    }
  }

  return (
    <details className="campaign-tools">
      <summary className="side-label">Campaign options</summary>
      {campaign.example && (
        <p className="tool-message">This example stays on this device. Rename it to make it yours and sync it.</p>
      )}
      {renaming ? (
        <form
          className="rename"
          onSubmit={async (e) => {
            e.preventDefault()
            await renameCampaign(campaign.id, name)
            setRenaming(false)
          }}
        >
          <input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit" className="btn small">Save</button>
        </form>
      ) : (
        <button type="button" className="link-btn" onClick={() => { setName(campaign.name); setRenaming(true) }}>Rename</button>
      )}
      <button
        type="button"
        className="link-btn"
        onClick={async () => onSwitch((await createCampaign('New campaign')).id)}
      >
        Start a new campaign
      </button>
      <button type="button" className="link-btn" onClick={download}>Back up to a file</button>
      <button type="button" className="link-btn" onClick={() => fileInput.current?.click()}>Restore from a file</button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className={confirmDelete ? 'link-btn danger-text' : 'link-btn'}
        onClick={async () => {
          if (!confirmDelete) return setConfirmDelete(true)
          await deleteCampaign(campaign.id)
          onSwitch(null)
        }}
      >
        {confirmDelete ? 'Tap again to delete this campaign and all its notes' : 'Delete campaign'}
      </button>
      {message && <p className="tool-message" role="status">{message}</p>}
    </details>
  )
}
