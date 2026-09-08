import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './store/store.ts'

import { BrowserRouter } from 'react-router-dom'
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
