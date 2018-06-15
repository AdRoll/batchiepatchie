// import { call, put, takeLatest } from 'redux-saga/effects';
import actionReducer from 'utils/actionReducer';

// Action names
export const SET_PAGE_DIMENSIONS = 'SET_PAGE_DIMENSIONS';

// Initial state
const initialState = {
    height: 800
};

const actions = {};

// Reducers
actions[SET_PAGE_DIMENSIONS] = (state, { payload }) => {
    return {
        ...state,
        ...payload
    };
};


// Action Creators
export function setPageDimensions(dimensions) {
    return {
        type: SET_PAGE_DIMENSIONS,
        payload: dimensions
    };
};

// Root reducer
export default actionReducer(actions, initialState);
