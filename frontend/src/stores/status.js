import actionReducer from 'utils/actionReducer';

// Action names
export const SET_ERROR_STATE = 'SET_ERROR_STATE';
export const SET_LOADING_STATE = 'SET_LOADING_STATE';

// Constants
export const JOB = 'JOB';
export const JOBS = 'JOBS';
export const LOGS = 'LOGS';
export const STATS = 'STATS';
export const JOB_QUEUES_ALL = 'JOB_QUEUES_ALL';
export const JOB_QUEUES_ACTIVATED = 'JOB_QUEUES_ACTIVATED';
export const STATUSES = [
    JOB,
    JOBS,
    LOGS,
    STATS,
    JOB_QUEUES_ALL,
    JOB_QUEUES_ACTIVATED
];

export function setErrorState(namespace, error) {
    return {
        type: SET_ERROR_STATE,
        payload: {
            namespace,
            error
        }
    };
};

export function setLoadingState(namespace, loading) {
    return {
        type: SET_LOADING_STATE,
        payload: {
            namespace,
            loading
        }
    };
};

const initialState = STATUSES.reduce((state, status) => {
    state[status] = {
        loading: true,
        error: false
    };
    return state;
}, {});

const actions = {};

actions[SET_ERROR_STATE] = (state, { payload: { namespace, error } }) => {
    return {
        ...state,
        [namespace]: {
            ...state[namespace],
            error
        }
    };
};

actions[SET_LOADING_STATE] = (state, { payload: { namespace, loading } }) => {
    return {
        ...state,
        [namespace]: {
            ...state[namespace],
            loading
        }
    };
};


function fetchData(dispatch, { status, fetch, result, options }) {
    const setLoadingError = (loading, error) => {
        dispatch(setErrorState(status, error));
        dispatch(setLoadingState(status, loading));
    };
    setLoadingError(true, false);

    return dispatch(fetch(options))
        .then(data => {
            dispatch(result(data));
            setLoadingError(false, false);
        })
        .catch((e) => {
            console.error(e);
            setLoadingError(false, true);
        });
};

export function fetchDataMultiple(fetchDataArguments) {
    return (dispatch, getState) => {
        const state = getState();
        const promises = fetchDataArguments.map(fetchDataArgument => fetchData(dispatch, fetchDataArgument));
        const promise = Promise.all(promises);
        return promise;
    };
}

export default actionReducer(actions, initialState);
