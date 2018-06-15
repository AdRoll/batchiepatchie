// import { call, put, takeLatest } from 'redux-saga/effects';
import actionReducer from 'utils/actionReducer';
import JobsApi from 'api/api';
import {
    fetchDataMultiple,
    JOB,
    JOBS,
    LOGS,
    STATS
} from './status';
import moment from 'moment';
import { push } from 'react-router-redux';
import { browserHistory } from 'react-router';
import queryString from 'query-string';

// Action names
export const SET_JOB = 'SET_JOB';
export const SET_JOBS = 'SET_JOBS';
export const SET_QUEUES = 'SET_QUEUES';
export const SET_LOGS = 'SET_LOGS';
export const SET_PAGE = 'SET_PAGE';
export const SET_SEARCH = 'SET_SEARCH';
export const SET_SELECTED_IDS = 'SET_SELECTED_IDS';
export const SET_SELECTED_QUEUE = 'SET_SELECTED_QUEUE';
export const SET_SELECTED_STATUS = 'SET_SELECTED_STATUS';
export const SET_SORT_PARAMS = 'SET_SORT_PARAMS';
export const SET_STATS = 'SET_STATS';
export const SET_JOB_QUEUES = 'SET_JOB_QUEUES';

// Constants
export const STATUSES = {
    SUBMITTED: 'SUBMITTED',
    PENDING: 'PENDING',
    RUNNABLE: 'RUNNABLE',
    STARTING: 'STARTING',
    RUNNING: 'RUNNING',
    FAILED: 'FAILED',
    SUCCEEDED: 'SUCCEEDED',
    GONE: 'GONE',
    TERMINATED: 'TERMINATED'
};

export const STATUS_ORDER = [
    STATUSES.SUBMITTED,
    STATUSES.PENDING,
    STATUSES.RUNNABLE,
    STATUSES.STARTING,
    STATUSES.RUNNING,
    STATUSES.FAILED,
    STATUSES.SUCCEEDED,
    STATUSES.GONE
];

export const STATUS_LABELS = {
    [STATUSES.SUBMITTED]: 'Submitted',
    [STATUSES.PENDING]: 'Pending',
    [STATUSES.RUNNABLE]: 'Runnable',
    [STATUSES.STARTING]: 'Starting',
    [STATUSES.RUNNING]: 'Running',
    [STATUSES.FAILED]: 'Failed',
    [STATUSES.SUCCEEDED]: 'Succeeded',
    [STATUSES.GONE]: 'Gone',
    [STATUSES.TERMINATED]: 'Terminated'
};

export const SORT_DIRECTIONS = {
    ASC: 'ASC',
    DESC: 'DESC'
};

export const SORT_FIELDS = {
    id: 'id',
    name: 'name',
    container: 'container',
    command: 'command',
    startTime: 'startTime',
    creationTime: 'creationTime'
};

export const QUERY_PARAM_DEFAULTS = {
    page: 0,
    q: '',
    selectedIds: [],
    selectedQueue: 'all',
    selectedStatus: 'all',
    sortDirection: SORT_DIRECTIONS.DESC,
    sortColumn: SORT_FIELDS.startTime
};

// Initial state
const initialState = {
    jobs: [],
    jobsById: {},
    logsById: {},
    page: 0,
    q: '',
    queues: [],
    selectedIds: [],
    selectedQueue: 'all',
    selectedStatus: 'all',
    sortDirection: SORT_DIRECTIONS.DESC,
    sortColumn: SORT_FIELDS.startTime,
    stats: {}
};

const actions = {};

// Reducers
actions[SET_JOB] = (state, { payload }) => {
    try {
        payload.command_line = JSON.parse(payload.command_line).join(' ');
    } catch (err) {
        payload.command_line = '';
    }

    return {
        ...state,
        jobsById: {
            ...state.jobsById,
            [payload.id]: payload
        }
    };
};

actions[SET_JOBS] = (state, { payload }) => {
    const jobs = payload.map(job => {
        try {
            job.command_line = JSON.parse(job.command_line).join(' ');
        } catch (err) {
            job.command_line = '';
        }
        return job;
    });

    return {
        ...state,
        jobs,
        jobsById: jobs.reduce((memo, job) => ({...memo, [job.id]: job}), {})
    };
};

actions[SET_QUEUES] = (state, { payload }) => {
    return {
        ...state,
        queues: payload
    };
};

actions[SET_LOGS] = (state, { payload }) => {
    return {
        ...state,
        logsById: {
            ...state.logsById,
            [payload.id]: payload.logs
        }
    };
};

actions[SET_PAGE] = (state, { payload }) => {
    return {
        ...state,
        page: payload
    };
};

actions[SET_SEARCH] = (state, { payload }) => {
    return {
        ...state,
        q: payload
    };
};

actions[SET_SELECTED_IDS] = (state, { payload }) => {
    return {
        ...state,
        selectedIds: payload
    };
};

actions[SET_SELECTED_QUEUE] = (state, { payload }) => {
    return {
        ...state,
        selectedQueue: payload
    };
};

actions[SET_SELECTED_STATUS] = (state, { payload }) => {
    return {
        ...state,
        selectedStatus: payload
    };
};

actions[SET_SORT_PARAMS] = (state, { payload }) => {
    return {
        ...state,
        sortColumn: payload.sortColumn,
        sortDirection: payload.sortDirection
    };
};

actions[SET_STATS] = (state, { payload }) => {
    return {
        ...state,
        stats: payload
    };
};

actions[SET_JOB_QUEUES] = (state, { payload }) => {
    return {
        ...state,
        queues: payload
    };
}

// Action Creators
export function setJob(job) {
    return {
        type: SET_JOB,
        payload: job
    };
};

export function setJobs(jobs) {
    return {
        type: SET_JOBS,
        payload: jobs
    };
};

export function setLogs(id, logs) {
    return {
        type: SET_LOGS,
        payload: {
            id,
            logs
        }
    };
};

export function setPage(page) {
    return {
        type: SET_PAGE,
        payload: page
    };
};

export function setSearch(q) {
    return {
        type: SET_SEARCH,
        payload: q
    };
};

export function setSelectedIds(selectedIds) {
    return {
        type: SET_SELECTED_IDS,
        payload: selectedIds
    };
};

export function setSelectedQueue(queue) {
    return {
        type: SET_SELECTED_QUEUE,
        payload: queue
    };
};

export function setSelectedStatus(status) {
    return {
        type: SET_SELECTED_STATUS,
        payload: status
    };
};

export function setSortParams(sortColumn, sortDirection) {
    return {
        type: SET_SORT_PARAMS,
        payload: {
            sortColumn,
            sortDirection
        }
    };
};

export function setStats(stats) {
    return {
        type: SET_STATS,
        payload: stats
    };
};

export function setJobQueues(job_queues) {
    return {
        type: SET_JOB_QUEUES,
        payload: job_queues
    };
}

export function setAndFetch(params) {
    return dispatch => {
        if (params.sortColumn && params.sortDirection)
            dispatch(setSortParams(params.sortColumn, params.sortDirection));

        if (params.q !== undefined)
            dispatch(setSearch(params.q));

        if (params.page !== undefined)
            dispatch(setPage(params.page));

        if (params.selectedQueue !== undefined)
            dispatch(setSelectedQueue(params.selectedQueue));

        if (params.selectedStatus !== undefined)
            dispatch(setSelectedStatus(params.selectedStatus));

        if (params.selectedIds !== undefined)
            dispatch(setSelectedIds(params.selectedIds));

        dispatch(updateJobsQueryParams());
        return dispatch(fetchJobsPage());
    };
};

export function updateJobsQueryParams() {
    return (dispatch, getState) => {
        const state = getState();
        const queryParams = {};

        // Push values to query params if not default
        Object.keys(QUERY_PARAM_DEFAULTS).forEach(q => {
            // Comma separated serialization for selected ids
            if (q === 'selectedIds') {
                const stateIds = state.job[q].join(',');
                const defaultIds = QUERY_PARAM_DEFAULTS[q].join(',');
                if (stateIds != defaultIds) {
                    queryParams[q] = stateIds;
                }
            } else if (state.job[q] !== QUERY_PARAM_DEFAULTS[q]) {
                queryParams[q] = state.job[q];
            }
        });

        const queryParamsStr = queryString.stringify(queryParams);
        const queryParamsWithQuestion = queryParamsStr.length > 0 ? `?${queryParamsStr}` : '' ;
        const newUrl = `/${queryParamsWithQuestion}`;

        // Push new state if different
        if (queryParamsWithQuestion !== window.location.search) {
            browserHistory.push(newUrl, {});
        }
    };
}

export function syncJobQueues() {
    return (dispatch, getState) => {
        const state = getState();
        return JobsApi.getJobQueues().then( (job_queues) => dispatch(setJobQueues(job_queues)) );
    };
}

export function fetchJob(id) {
    return (dispatch, getState) => {
        const state = getState();
        return JobsApi.getJob(id).then( (job) => addDerivedJobValues([job])[0] );
    };
};

export function fetchLogs(id) {
    return (dispatch, getState) => {
        const state = getState();
        return JobsApi.getLogs(id);
    };
};

export function fetchJobs() {
    return (dispatch, getState) => {
        const state = getState();
        const params = {
            page: state.job.page,
            q: state.job.q,
            sortDirection: state.job.sortDirection,
            sortColumn: state.job.sortColumn
        };

        if (state.job.selectedQueue !== 'all') {
            params.queue = state.job.selectedQueue;
        }

        if (state.job.selectedStatus !== 'all') {
            params.status = state.job.selectedStatus;
        }

        return JobsApi.getJobs(params).then(addDerivedJobValues);
    };
};

export function fetchStats() {
    return (dispatch) => JobsApi.getStats();
};

export function fetchJobPage(id) {
    return fetchDataMultiple([
        {
            status: JOB,
            fetch: fetchJob,
            result: setJob,
            options: id
        }
    ]);
};

export function fetchJobLogs(id) {
    return fetchDataMultiple([
        {
            status: LOGS,
            fetch: fetchLogs,
            result: (logs) => setLogs(id, logs),
            options: id
        }
    ]);
};

export function fetchJobsPage() {
    return fetchDataMultiple([
        {
            status: JOBS,
            fetch: fetchJobs,
            result: setJobs
        }
    ]);
};

export function fetchStatsPage() {
    return fetchDataMultiple([
        {
            status: STATS,
            fetch: fetchStats,
            result: setStats
        }
    ]);
};

export function killJobs(ids) {
    return (dispatch, getState) => {
        if (window.confirm(`Are you sure you wish to kill ${ids.length} jobs?`)) {
            return JobsApi.killJobs(ids);
        }
        return Promise.reject();
    };
};

function isFinished(job) {
    return job.status === 'FAILED' || job.status === 'SUCCEEDED' || job.status === 'GONE' || job.status === 'TERMINATED';
}

function addDerivedTerminatedStatus(job) {
    /* 137, 130 and 143 are SIGKILL, SIGINT and SIGTERM by docker */
    if ( (job.exitcode === 137 || job.exitcode === 130 || job.exitcode === 143) && job.status === 'FAILED' ) {
        job.status = 'TERMINATED';
    }
}

function addDerivedRuntime(job) {
    /* 'runtime'. It's the time the job was actually running (not
     * counting queued time). */
    job.runtime = null;
    if ( job.stopped_at && job.run_start_time ) {
        const stopped_at = moment.utc(job.stopped_at);
        const run_started_at = moment.utc(job.run_start_time);
        if ( stopped_at && run_started_at ) {
            job.runtime = moment.duration(stopped_at.diff(run_started_at));
        }
    } else if ( job.run_start_time && !isFinished(job) ) {
        const run_started_at = moment.utc(job.run_start_time);
        if ( run_started_at ) {
            job.runtime = moment.duration(moment().diff(run_started_at));
        }
    } else if ( job.run_start_time ) {
        const run_started_at = moment.utc(job.run_start_time);
        const last_updated = moment.utc(job.last_updated);
        if ( run_started_at && last_updated ) {
            job.runtime = moment.duration(last_updated.diff(run_started_at));
        }
    } else if ( !job.run_start_time && job.status === 'RUNNING' ) {
        /* It appears that there may not be `run_start_time` until the job has
         * actually finished.  We infer the start time from last_updated field
         * here (it'll be fixed when `run_start_time` gets populated by AWS
         * Batch; whenever that is. */
        const last_updated = moment.utc(job.last_updated);
        if ( last_updated ) {
            job.runtime = moment.duration(moment().diff(last_updated));
        }
    }
}

function addDerivedTotalElapsedTime(job) {
    /* 'total_elapsed_time'. Total time job has spent on queue/been running. */
    if ( job.created_at && job.stopped_at ) {
        const created_at = moment.utc(job.created_at);
        const stopped_at = moment.utc(job.stopped_at);
        if ( stopped_at && created_at ) {
            job.total_elapsed_time = moment.duration(stopped_at.diff(created_at));
        }
    } else if ( job.created_at &&
                isFinished(job) ) {
        /* Sometimes there is no `stopped_at` time (e.g. when the job never even started) */
        /* In these cases we have to use something else; here we use last_updated field. */
        const created_at = moment.utc(job.created_at);
        const last_updated = moment.utc(job.last_updated);
        if ( created_at && last_updated ) {
            job.total_elapsed_time = moment.duration(last_updated.diff(created_at));
        }
    } else if ( job.created_at ) {
        /* Here we assume the job is in some way still active (queued/running/whatever).
         * We can use current time to measure how long it has been on queue. */
        const created_at = moment.utc(job.created_at);
        if ( created_at ) {
            job.total_elapsed_time = moment.duration(moment().diff(created_at));
        }
    }
}

function addDerivedJobValues(jobs) {
    /* Fill in some derived values that are not directly present from backend. */
    for ( let key in jobs ) {
        let job = jobs[key];

        addDerivedTerminatedStatus(job);
        addDerivedRuntime(job);
        addDerivedTotalElapsedTime(job);
    }

    return jobs;
}

// Root reducer
export default actionReducer(actions, initialState);
