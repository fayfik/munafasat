import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './state/store.jsx';
import { RequestsProvider } from './state/requests.jsx';
import { ActorProvider } from './state/actor.jsx';
import './styles/theme.css';
import './styles/app.css';
import './styles/form.css';

createRoot(document.getElementById('root')).render(
  <StoreProvider>
    <ActorProvider>
      <RequestsProvider>
        <App />
      </RequestsProvider>
    </ActorProvider>
  </StoreProvider>,
);
