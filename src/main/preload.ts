import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add your IPC methods here as needed
  // Example:
  // getVersion: () => ipcRenderer.invoke('app:getVersion'),
});
