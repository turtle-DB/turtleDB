import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
// css
import './assets/styles/index.css';

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
