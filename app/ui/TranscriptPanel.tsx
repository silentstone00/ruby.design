import { FormEvent, useRef, useState } from 'react'
import { Mic, SendHorizonal } from 'lucide-react'
import type { CanvasContext } from '../canvas/canvasContext'
import type { OperationResult } from '../operations/types'
import { createSttAdapter } from '../voice/sttFactory'
import type { SttAdapter } from '../voice/sttAdapter'
import { useTranscriptState } from '../voice/transcriptStore'

type TranscriptPanelProps = {
  onSubmit: (command: string) => void
  history: OperationResult[]
  context: CanvasContext | null
}

export function TranscriptPanel({ onSubmit, history, context }: TranscriptPanelProps) {
  const [command, setCommand] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const sttAdapter = useRef<SttAdapter | null>(null)
  const transcript = useTranscriptState()

  function submit(event: FormEvent) {
    event.preventDefault()
    const next = command.trim()
    if (!next) return
    transcript.addFinal(next)
    onSubmit(next)
    setCommand('')
  }

  async function toggleMic() {
    setSpeechError(null)

    if (isListening) {
      await sttAdapter.current?.stop()
      setIsListening(false)
      transcript.setInterim('')
      return
    }

    const adapter = createSttAdapter()
    sttAdapter.current = adapter
    setIsListening(true)

    await adapter.start((event) => {
      if (event.type === 'interim') {
        transcript.setInterim(event.text)
        setCommand(event.text)
        return
      }

      if (event.type === 'final') {
        transcript.addFinal(event.text)
        setCommand('')
        setIsListening(false)
        onSubmit(event.text)
        return
      }

      if (event.type === 'end') {
        setIsListening(false)
        return
      }

      setSpeechError(event.message)
      setIsListening(false)
    })
  }

  return (
    <div className="transcript-panel">
      <div className="panel-heading">
        <div>
          <h1>Ruby Design</h1>
          <p>{context ? `${context.visibleShapes.length} shapes in view` : 'Canvas starting'}</p>
        </div>
        <button
          className={isListening ? 'mic-button is-listening' : 'mic-button'}
          title={isListening ? 'Stop listening' : 'Push to talk'}
          aria-label={isListening ? 'Stop listening' : 'Push to talk'}
          onClick={toggleMic}
        >
          <Mic size={18} />
        </button>
      </div>

      {(transcript.interim || speechError) && (
        <div className={speechError ? 'speech-status speech-error' : 'speech-status'}>
          {speechError ?? transcript.interim}
        </div>
      )}

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
              <div className={entry.pending ? 'history-pending' : entry.ok ? 'history-ok' : 'history-error'}>{entry.message}</div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
