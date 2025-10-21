import { useState, useEffect } from "react";

interface UseKeyboardInputOptions {
  /** Skip modifier key combinations (Ctrl, Meta, Alt) */
  skipModifiers?: boolean;
  /** Character to use for space */
  spaceChar?: string;
  /** Convert to uppercase */
  uppercase?: boolean;
  /** Initial character */
  initialChar?: string;
}

/**
 * Custom hook for handling keyboard input and tracking the current character
 * @param options Configuration options for keyboard handling
 * @returns Current character state and setter
 */
export function useKeyboardInput(options: UseKeyboardInputOptions = {}) {
  const {
    skipModifiers = true,
    spaceChar = "␣",
    uppercase = true,
    initialChar = "A",
  } = options;

  const [currentChar, setCurrentChar] = useState(initialChar);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip modifier key combinations if enabled
      if (
        skipModifiers &&
        (event.ctrlKey || event.metaKey || event.altKey)
      ) {
        return;
      }

      let char = event.key;

      // Handle space character
      if (char === " ") {
        char = spaceChar;
      } else if (char.length > 1) {
        // Skip special keys (Enter, Escape, Arrow keys, etc.)
        return;
      }

      // Convert to uppercase if enabled
      if (uppercase) {
        char = char.toUpperCase();
      }

      setCurrentChar(char);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [skipModifiers, spaceChar, uppercase]);

  return { currentChar, setCurrentChar };
}
