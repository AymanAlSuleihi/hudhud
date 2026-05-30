import React from "react"

interface OnScreenKeyboardProps {
  onInsert: (char: string) => void
}

const SPECIAL_CHARS = [
  "ʾ",
  "ʿ",
  "s¹",
  "s²",
  "s³",
  "ṣ",
  "ḍ",
  "ḏ",
  "ẓ",
  "ḥ",
  "ẖ",
  "ḫ",
  "ṭ",
  "ṯ",
  "ġ",
]

export const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({ onInsert }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {SPECIAL_CHARS.map((char) => (
        <button
          key={char}
          type="button"
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-stone-300 bg-white px-2 text-base font-semibold text-stone-700 shadow-sm transition-colors hover:border-stone-500 hover:text-stone-900"
          onClick={() => onInsert(char)}
        >
          {char}
        </button>
      ))}
    </div>
  )
}
