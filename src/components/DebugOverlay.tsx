import type { ReactNode, CSSProperties } from "react";

interface DebugOverlayProps {
  /** Main content to display */
  children?: ReactNode;
  /** Position of the overlay */
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Additional custom styles */
  style?: CSSProperties;
}

/**
 * Reusable debug overlay component for displaying information over Three.js canvas
 */
export default function DebugOverlay({
  children,
  position = "top-left",
  style = {},
}: DebugOverlayProps) {
  const positionStyles: Record<string, CSSProperties> = {
    "top-left": { top: "20px", left: "20px" },
    "top-right": { top: "20px", right: "20px" },
    "bottom-left": { bottom: "20px", left: "20px" },
    "bottom-right": { bottom: "20px", right: "20px" },
  };

  const baseStyle: CSSProperties = {
    position: "absolute",
    color: "white",
    fontFamily: "monospace",
    fontSize: "18px",
    background: "rgba(0, 0, 0, 0.7)",
    padding: "10px 20px",
    borderRadius: "8px",
    ...positionStyles[position],
    ...style,
  };

  return <div style={baseStyle}>{children}</div>;
}

interface DebugTextProps {
  /** Text content */
  children: ReactNode;
  /** Secondary/muted styling */
  secondary?: boolean;
  /** Custom styles */
  style?: CSSProperties;
}

/**
 * Text component for use within DebugOverlay
 */
export function DebugText({ children, secondary, style = {} }: DebugTextProps) {
  const textStyle: CSSProperties = {
    marginTop: secondary ? "10px" : "0",
    fontSize: secondary ? "14px" : "18px",
    opacity: secondary ? 0.7 : 1,
    ...style,
  };

  return <div style={textStyle}>{children}</div>;
}

interface DebugButtonProps {
  /** Button text */
  children: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Active/selected state */
  active?: boolean;
  /** Custom styles */
  style?: CSSProperties;
}

/**
 * Button component for use within DebugOverlay
 */
export function DebugButton({
  children,
  onClick,
  active = false,
  style = {},
}: DebugButtonProps) {
  const buttonStyle: CSSProperties = {
    marginTop: "10px",
    padding: "6px 12px",
    background: active ? "#667eea" : "rgba(255, 255, 255, 0.2)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "12px",
    ...style,
  };

  return (
    <button onClick={onClick} style={buttonStyle}>
      {children}
    </button>
  );
}
