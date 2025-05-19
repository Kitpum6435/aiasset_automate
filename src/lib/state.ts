// ✅ File: lib/state.ts
// This file manages the automation play/pause state and generation settings across all API routes and worker threads.

let isPlaying = false;
let currentRatio: string = "1:1";
let lastStarted: string | null = null;

export const getStatus = () => isPlaying;
export const setStatus = (val: boolean) => {
  isPlaying = val;
  if (val) {
    lastStarted = new Date().toISOString();
  }
};

export const getRatio = () => currentRatio;
export const setRatio = (val: string) => {
  currentRatio = val;
};

export const getLastRun = () => lastStarted;

// Optional: Export reset for testing/debugging
export const resetAutomation = () => {
  isPlaying = false;
  currentRatio = "1:1";
  lastStarted = null;
};
