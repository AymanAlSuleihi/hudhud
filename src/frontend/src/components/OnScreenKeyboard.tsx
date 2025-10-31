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
    <div className="inline-flex flex-wrap gap-2 p-4 rounded-sm backdrop-blur-xs drop-shadow-md shadow-sm border border-gray-400">
      {SPECIAL_CHARS.map((char) => (
        <button
          key={char}
          type="button"
          className="px-1 py-1 rounded shadow border border-gray-900 hover:border-gray-700 hover:text-gray-700 text-lg font-semibold transition-all w-10 h-10 bg-white/40 backdrop-blur-xs"
          onClick={() => onInsert(char)}
        >
          {char}
        </button>
      ))}
    </div>
  )
}
