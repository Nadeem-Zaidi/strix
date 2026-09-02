import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './state_mngmt/store.ts'
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'

// Temporary diagnostic — remove once VITE_API_URL is confirmed loading correctly.
console.log("hello")
console.log("VITE_API_URL:", import.meta.env.VITE_API_URL);
console.log("all env:", import.meta.env);

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>

)
