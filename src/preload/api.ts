/** Shape of the API exposed to the renderer as `window.api`. Keep this minimal and typed. */
export interface AppApi {
  getVersion(): Promise<string>;
}

export const IPC_CHANNELS = {
  getVersion: 'app:get-version',
} as const;
