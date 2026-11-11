import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './state/store.jsx';
import './styles/theme.css';
import './styles/app.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <App />
  </StoreProvider>,
);
