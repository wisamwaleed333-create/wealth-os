import {createRoot} from 'react-dom/client';
import {initAppUpdater} from './utils/appUpdateManager.ts';
import App from './App.tsx';
import './index.css';

initAppUpdater();

createRoot(document.getElementById('root')!).render(<App />);
