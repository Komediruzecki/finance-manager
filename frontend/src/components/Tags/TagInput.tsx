/**
 * Tag Input Component
 * Inline tag creation with enter key to add
 */
import { createSignal } from 'solid-js'
import styles from './TagInput.module.css'

export interface TagInputProps {
  existingTags: () => string[]
  onAdd: (tag: string) => void
  placeholder?: string
  maxSize?: number
  autoFocus?: boolean
}

export function TagInput(props: TagInputProps) {
  const [tagText, setTagText] = createSignal('')

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Escape') {
      setTagText('')
    }
  }

  const addTag = () => {
    const tag = tagText().trim()
    const existing = props.existingTags()

    if (tag && !existing.includes(tag)) {
      props.onAdd(tag)
      setTagText('')
    }
  }

  return (
    <div class={styles['tag-input']}>
      <input
        class={styles['tag-input__input']}
        type="text"
        value={tagText()}
        onInput={(e) => setTagText(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={props.placeholder || 'Add tag and press Enter'}
        autocomplete="off"
        autofocus={props.autoFocus}
      />
      <span class={styles['tag-input__divider']}>+</span>
    </div>
  )
}

export default function TagInputDefault(props: TagInputProps) {
  return <TagInput {...props} />
}
