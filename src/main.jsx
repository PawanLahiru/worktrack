import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerSW({
  immediate: true,

  onRegisteredSW(swUrl) {
    console.log(
      "WorkTrack service worker registered:",
      swUrl
    );
  },

  onRegisterError(error) {
    console.error(
      "Service worker registration error:",
      error
    );
  },
});