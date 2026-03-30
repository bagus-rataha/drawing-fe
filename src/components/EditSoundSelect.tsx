import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Square } from 'lucide-react'
import { useSound } from '@/hooks'

interface EditSoundSelectProps {
  label: string
  value: string
  options: Record<string, { label: string; file: string | null }>
  onChange: (v: string) => void
}

export function EditSoundSelect({ label, value, options, onChange }: EditSoundSelectProps) {
  const { preview, stopPreview } = useSound()
  const [playing, setPlaying] = useState(false)

  const handleToggle = () => {
    if (playing) {
      stopPreview()
      setPlaying(false)
    } else {
      const file = options[value]?.file
      if (file) {
        preview(file)
        setPlaying(true)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    stopPreview()
    setPlaying(false)
    onChange(e.target.value)
  }

  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <select className="flex-1 rounded-md border px-3 py-2 text-sm" value={value} onChange={handleChange}>
          {Object.entries(options).map(([key, opt]) => (
            <option key={key} value={key}>{opt.label}</option>
          ))}
        </select>
        {value && options[value]?.file && (
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={handleToggle}>
            {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}
