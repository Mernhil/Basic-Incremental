import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type AppApi } from './api';

const api: AppApi = {
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.getVersion) as Promise<string>,
  isUpdateReady: () => ipcRenderer.invoke(IPC_CHANNELS.isUpdateReady) as Promise<boolean>,
  onUpdateReady: (callback) => {
    const listener = (): void => callback();
    ipcRenderer.on(IPC_CHANNELS.updateReady, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.updateReady, listener);
    };
  },
  restartToInstall: () => ipcRenderer.send(IPC_CHANNELS.restartToInstall),
};

contextBridge.exposeInMainWorld('api', api);
