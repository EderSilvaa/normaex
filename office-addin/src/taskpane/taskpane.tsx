import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './components/App';
import './styles/taskpane.css';

/* global document, Office, module, require */

const title = 'Normaex AI';

const render = (Component: React.ComponentType<any>) => {
  ReactDOM.render(
    <Component title={title} />,
    document.getElementById('root')
  );
};

/* Render application after Office initializes */
Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    render(App);
  }
});

if ((module as any).hot) {
  (module as any).hot.accept('./components/App', () => {
    const NextApp = require('./components/App').default;
    render(NextApp);
  });
}
