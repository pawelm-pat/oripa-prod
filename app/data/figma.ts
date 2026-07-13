import type { Screen } from "../lib/types";

// Figma source file for the "Product designs" panel.
// File: OripaLot — UI Creative Template
export const FIGMA_FILE_KEY = "cIHlNEoRewOoqqDEqD04HQ";
export const FIGMA_FILE_NAME = "OripaLot---UI-Creative-Template";

// Fallback frame shown when a screen has no specific mapping yet.
export const FIGMA_DEFAULT_NODE = "3-2";

// Per-screen Figma frame node-ids. Fill these in as the matching frames are
// identified in the Figma file (use the node-id from the frame's share link,
// e.g. "3-2"). Screens without an entry fall back to FIGMA_DEFAULT_NODE.
export const FIGMA_NODES: Partial<Record<Screen, string>> = {
  // landing: "3-2",
  // signup: "",
  // login: "",
  // oripa: "",
  // notifications: "",
  // prizeHistory: "",
  // myLoot: "",
  // purchaseHistory: "",
  // coinHistory: "",
  // store: "",
  // shippingAddress: "",
  // mypage: "",
  // quest: "",
};

export function nodeForScreen(screen: Screen): string {
  return FIGMA_NODES[screen] ?? FIGMA_DEFAULT_NODE;
}

export function figmaFileUrl(node: string): string {
  return `https://www.figma.com/design/${FIGMA_FILE_KEY}/${FIGMA_FILE_NAME}?node-id=${encodeURIComponent(node)}`;
}

// Embeddable viewer URL (requires the file's link sharing to allow "Anyone with
// the link can view"). Renders inside an <iframe>.
// Uses the modern embed endpoint and focuses on the given frame:
//  - node-id      : the frame to open
//  - hide-ui=1    : hide the Figma toolbar/side panels
//  - scaling=contain : fit the referenced frame to the viewport (zoom to frame)
export function figmaEmbedUrl(node: string): string {
  const params = new URLSearchParams({
    "node-id": node,
    "embed-host": "oripa-prod",
    "hide-ui": "1",
    scaling: "contain",
  });
  return `https://embed.figma.com/design/${FIGMA_FILE_KEY}/${FIGMA_FILE_NAME}?${params.toString()}`;
}
