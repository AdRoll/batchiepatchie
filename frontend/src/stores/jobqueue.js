import actionReducer from 'utils/actionReducer';
import JobsApi from 'api/api';
import { fetchDataMultiple, JOB_QUEUES_ALL, JOB_QUEUES_ACTIVATED } from './status';

export const SET_JOB_QUEUE_ACTIVATED_QUEUES = 'SET_JOB_QUEUE_ACTIVATED_QUEUES';
export const SET_JOB_QUEUE_ALL_QUEUES = 'SET_JOB_QUEUE_ALL_QUEUES';

const initialState = {
    allJobQueues: [],
    activatedJobQueues: []
};

const actions = {};

actions[SET_JOB_QUEUE_ACTIVATED_QUEUES] = (state, { payload }) => {
    return {
        ...state,
        activatedJobQueues: payload
    };
};

actions[SET_JOB_QUEUE_ALL_QUEUES] = (state, { payload }) => {
    return {
        ...state,
        allJobQueues: payload
    };
};

export function setJobQueues(job_queues) {
    return {
        type: SET_JOB_QUEUE_ACTIVATED_QUEUES,
        payload: job_queues
    };
};

export function setAllJobQueues(job_queues) {
    return {
        type: SET_JOB_QUEUE_ALL_QUEUES,
        payload: job_queues
    };
};

export function fetchJobQueues() {
    return fetchDataMultiple([
        {
            status: JOB_QUEUES_ACTIVATED,
            fetch: fetchJobQueuesInner,
            result: setJobQueues
        }
    ]);
}

export function fetchAllJobQueues() {
    return fetchDataMultiple([
        {
            status: JOB_QUEUES_ALL,
            fetch: fetchAllJobQueuesInner,
            result: setAllJobQueues
        }
    ]);
}

export function activateJobQueue(job_queue_name) {
    return (dispatch, getState) => {
        return JobsApi.activateJobQueue(job_queue_name);
    };
}

export function deactivateJobQueue(job_queue_name) {
    return (dispatch, getState) => {
        return JobsApi.deactivateJobQueue(job_queue_name);
    };
}

function fetchJobQueuesInner() {
    return (dispatch, getState) => {
        const state = getState();
        return JobsApi.getJobQueues();
    };
};

function fetchAllJobQueuesInner() {
    return (dispatch, getState) => {
        const state = getState();
        return JobsApi.getAllJobQueues();
    };
};

// Root reducer
export default actionReducer(actions, initialState);
