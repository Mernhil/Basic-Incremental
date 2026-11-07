import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type AppApi } from './api';

const api: AppApi = {
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.getVersion) as Promise<string>,
};

contextBridge.exposeInMainWorld('api', api);
