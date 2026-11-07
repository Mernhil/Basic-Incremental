/** Shape of the API exposed to the renderer as `window.api`. Keep this minimal and typed. */
export interface AppApi {
  getVersion(): Promise<string>;
  /** Whether an update has already been downloaded and is waiting for a restart. */
  isUpdateReady(): Promise<boolean>;
  /** Called when an update finishes downloading. Returns an unsubscribe function. */
  onUpdateReady(callback: () => void): () => void;
  /** Quits the app and installs the downloaded update. No-op if none is ready. */
  restartToInstall(): void;
}

export const IPC_CHANNELS = {
  getVersion: 'app:get-version',
  isUpdateReady: 'update:is-ready',
  updateReady: 'update:ready',
  restartToInstall: 'update:restart-to-install',
} as const;
