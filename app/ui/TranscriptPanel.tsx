import { FormEvent, useState } from 'react'
import { Mic, SendHorizonal } from 'lucide-react'
import type { CanvasContext } from '../canvas/canvasContext'
import type { OperationResult } from '../operations/types'
import { useTranscriptState } from '../voice/transcriptStore'

type TranscriptPanelProps = {
  onSubmit: (command: string) => void
  history: OperationResult[]
  context: CanvasContext | null
}

export function TranscriptPanel({ onSubmit, history, context }: TranscriptPanelProps) {
  const [command, setCommand] = useState('')
  const transcript = useTranscriptState()

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = command.trim()
    if (!next) return
    transcript.addFinal(next)
    onSubmit(next)
    setCommand('')
  }

  return (
    <div className="transcript-panel">
      <div className="panel-heading">
        <div>
          <h1>Ruby Design</h1>
          <p>{context ? `${context.visibleShapes.length} shapes in view` : 'Canvas starting'}</p>
        </div>
        <button className="mic-button" title="Push to talk" aria-label="Push to talk">
          <Mic size={18} />
        </button>
      </div>

      <form className="command-form" onSubmit={submit}>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="Make this blue, add a title, move it left..."
          aria-label="Design command"
        />
        <button type="submit" title="Run command" aria-label="Run command">
          <SendHorizonal size={18} />
        </button>
      </form>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-state">
            Try: “add a blue button”, “make it bigger”, or “move this left”.
          </div>
        ) : (
          history.map((entry) => (
            <article className="history-item" key={entry.id}>
              <div className="history-command">{entry.command}</div>
              <div className={entry.ok ? 'history-ok' : 'history-error'}>{entry.message}</div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
