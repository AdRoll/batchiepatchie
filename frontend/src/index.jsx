import 'whatwg-fetch';
import './index.scss';
import 'react-virtualized/styles.css';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { Router, IndexRoute, Route, browserHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import configureStore from './stores';

import LayoutContainer from './containers/LayoutContainer/LayoutContainer';

// Pages
import JobsPage from './pages/JobsPage/JobsPage';
import JobQueuesPage from './pages/JobQueuesPage/JobQueuesPage';
import JobPage from './pages/JobPage/JobPage';
import StatsPage from './pages/StatsPage/StatsPage';

// Store and router
const store = configureStore();
const history = syncHistoryWithStore(browserHistory, store);

render(
    <Provider store={ store }>
        <Router history={ history }>
            <Route path='/batchiepatchie' component={ LayoutContainer }>
                <IndexRoute component={ JobsPage } />
                <Route path='job/:id' component={ JobPage } />
                <Route path='stats' component={ StatsPage } />
                <Route path='job_queues' component={ JobQueuesPage } />
            </Route>
        </Router>
    </Provider>,
    document.getElementById('root')
);
