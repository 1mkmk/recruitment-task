import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize theme from cookie
const initializeTheme = () => {
  // Try to get theme from cookie
  const themeCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('theme='));
    
  let theme = 'light';
  
  if (themeCookie) {
    // Use theme from cookie
    theme = themeCookie.split('=')[1];
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // Use system preference if no cookie
    theme = 'dark';
  }
  
  // Apply theme to document
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// Initialize theme before rendering
initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
