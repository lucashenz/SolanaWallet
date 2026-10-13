// Polyfills must load before anything that touches crypto or Buffer.
import './src/polyfills';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
