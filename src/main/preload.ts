import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  googleAuth: {
    login: () => ipcRenderer.invoke('google-auth:login'),
    logout: () => ipcRenderer.invoke('google-auth:logout'),
    isAuthenticated: () => ipcRenderer.invoke('google-auth:isAuthenticated'),
    getAccessToken: () => ipcRenderer.invoke('google-auth:getAccessToken'),
  },
});
