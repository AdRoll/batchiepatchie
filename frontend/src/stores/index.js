import {
    createStore,
    combineReducers,
    applyMiddleware,
    compose
} from 'redux';
import thunk from 'redux-thunk';
import { browserHistory } from 'react-router';
import { routerReducer, routerMiddleware } from 'react-router-redux';

// Reducers
import jobReducer from './job';
import layoutReducer from './layout';
import statusReducer from './status';
import jobQueueReducer from './jobqueue';

const rootReducer = combineReducers({
    job: jobReducer,
    jobqueue: jobQueueReducer,
    layout: layoutReducer,
    routing: routerReducer,
    status: statusReducer
});

const finalCreateStore = compose(
    applyMiddleware(routerMiddleware(browserHistory), thunk),
    window.devToolsExtension && process.env.NODE_ENV === 'development' ? window.devToolsExtension() : f => f
)(createStore);

export default function configureStore(initialState) {
    return finalCreateStore(rootReducer, initialState);
};
