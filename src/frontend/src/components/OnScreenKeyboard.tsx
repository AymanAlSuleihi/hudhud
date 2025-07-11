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
    <div className="inline-flex flex-wrap gap-2 p-2 rounded border border-gray-300 bg-white">
      {SPECIAL_CHARS.map((char) => (
        <button
          key={char}
          type="button"
          className="px-3 py-2 rounded bg-zinc-600 text-white hover:bg-zinc-700 text-lg font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 transition-all min-w-[2.5rem] min-h-[2.5rem]"
          onClick={() => onInsert(char)}
        >
          {char}
        </button>
      ))}
    </div>
  )
}
