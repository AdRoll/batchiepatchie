import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import ReactDataGrid from 'react-data-grid';
import {
    fetchJobsPage,
    killJobs,
    setSelectedIds,
    setParams,
    syncJobQueues,
    updateJobsQueryParams,
    QUERY_PARAM_DEFAULTS
} from 'stores/job';
import { JOBS } from 'stores/status';
import CommandLineFormatter from 'components/CommandLineFormatter/CommandLineFormatter';
import DateTimeFormatter from 'components/DateTimeFormatter/DateTimeFormatter';
import StatusFormatter from 'components/StatusFormatter/StatusFormatter';
import JobLinkFormatter from 'components/JobLinkFormatter/JobLinkFormatter';
import NameFormatter from 'components/NameFormatter/NameFormatter';
import ImageFormatter from 'components/ImageFormatter/ImageFormatter';
import DurationFormatter from 'components/DurationFormatter/DurationFormatter';
import RowRenderer from 'components/RowRenderer/RowRenderer';
import QueueSelector from 'components/QueueSelector/QueueSelector';
import StatusSelector from 'components/StatusSelector/StatusSelector';
import './JobsPage.scss';
import 'react-select/dist/react-select.css';

const AUTO_REFRESH_TIMEOUT = 5000; // ms

const COLUMNS = [
    {
        key: 'id',
        name: 'ID',
        resizable: false,
        sortable: true,
        width: 95,
        formatter: JobLinkFormatter
    },
    {
        key: 'status',
        name: 'Status',
        resizable: false,
        sortable: true,
        width: 120,
        formatter: StatusFormatter
    },
    {
        key: 'name',
        name: 'Name',
        resizable: true,
        sortable: true,
        width: 310,
        formatter: NameFormatter
    },
    {
        key: 'image',
        name: 'Image',
        resizable: true,
        width: 270,
        formatter: ImageFormatter
    },
    {
        key: 'runtime',
        name: 'Runtime',
        resizable: true,
        width: 140,
        formatter: DurationFormatter
    },
    {
        key: 'total_elapsed_time',
        name: 'Total elapsed',
        resizable: true,
        width: 140,
        formatter: DurationFormatter
    },
    {
        key: 'stopped_at',
        name: 'Stopped At',
        resizable: true,
        sortable: true,
        width: 280,
        formatter: DateTimeFormatter
    },
    {
        key: 'job_queue',
        name: 'Queue',
        resizable: true,
        width: 270
    },
    {
        key: 'last_updated',
        name: 'Last Updated',
        resizable: true,
        sortable: true,
        width: 280,
        formatter: DateTimeFormatter
    },
    {
        key: 'vcpus',
        name: 'CPUs',
        width: 80
    },
    {
        key: 'memory',
        name: 'Memory',
        width: 80
    },
    {
        key: 'command_line',
        name: 'Command Line',
        width: 800,
        resizable: true,
        formatter: CommandLineFormatter
    }
];

const MIN_WIDTH = COLUMNS.reduce((memo, column) => memo + column.width, 0);

const PAGE_SIZE = 100;

class JobsPage extends React.Component {
    static propTypes = {
        fetchJobsPage: PropTypes.func.isRequired,
        height: PropTypes.number.isRequired,
        jobs: PropTypes.array.isRequired,
        killJobs: PropTypes.func.isRequired,
        q: PropTypes.string,
        routing: PropTypes.object.isRequired,
        selectedIds: PropTypes.array.isRequired,
        setParams: PropTypes.func.isRequired,
        setSelectedIds: PropTypes.func.isRequired,
        sortColumn: PropTypes.string,
        sortDirection: PropTypes.string,
        status: PropTypes.object.isRequired,
        syncJobQueues: PropTypes.func.isRequired,
        updateJobsQueryParams: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        // Using state for autoRefresh so it resets to false on navigation
        this.state = {
            autoRefresh: false
        };
    }

    componentDidMount() {
        this.loadStateFromQueryParams();
        this.props.syncJobQueues();
    }

    componentDidUpdate(prevProps) {
        if (this.props.q !== prevProps.q ||
            this.props.sortColumn !== prevProps.sortColumn ||
            this.props.sortDirection !== prevProps.sortDirection ||
            this.props.page !== prevProps.page ||
            this.props.selectedStatus !== prevProps.selectedStatus ||
            this.props.selectedQueue !== prevProps.selectedQueue) {
            this.props.updateJobsQueryParams();
            this.props.fetchJobsPage();
            this.props.updateJobsQueryParams();
        }
    }

    componentWillUnmount() {
        const autoRefresh = false;
        this.state.autoRefresh = autoRefresh;
        this.setState({ autoRefresh });
    }

    render() {
        const {
            jobs,
            height,
            queues,
            status
        } = this.props;

        if (!status.loading && status.error) {
            return (
                <div className='jobs-page'>
                    <div className='alert alert-danger'>
                        Could not load API response for jobs.
                    </div>
                </div>
            );
        }

        const listHeight = height - 240;

        return (
            <div className='jobs-page'>
                <h2>Jobs</h2>

                <div className='actions'>
                    <button
                        className='btn btn-success'
                        onClick={ this.props.fetchJobsPage }
                        >
                        Refresh
                    </button>

                    <button
                        className='btn btn-danger'
                        disabled={ !this.props.selectedIds.length }
                        onClick={ this.killJobs }
                    >
                        Kill { this.props.selectedIds.length } jobs
                    </button>
                    <StatusSelector />
                    <QueueSelector />
                    <div className='auto-refresh'>
                        <input
                            id='auto-refresh'
                            className='ar-toggle'
                            type='checkbox'
                            checked={ this.state.autoRefresh }
                            onChange={ this.setAutoRefresh }
                        />
                        <label htmlFor='auto-refresh'>Auto Refresh</label>
                    </div>
                </div>

                <ReactDataGrid
                    columns={ COLUMNS }
                    minHeight={ listHeight }
                    onGridSort={ this.onGridSort }
                    rowsCount={ jobs.length }
                    rowGetter={ this.rowGetter }
                    rowKey='id'
                    rowSelection={ {
                        showCheckbox: true,
                        enableShiftSelect: true,
                        onRowsSelected: this.onRowsSelected,
                        onRowsDeselected: this.onRowsDeselected,
                        selectBy: {
                            keys: {
                                rowKey: 'id',
                                values: this.props.selectedIds
                            }
                        }
                    }}
                    rowRenderer={RowRenderer}
                />

                <nav>
                    <ul className='pagination'>
                        <li className={ classNames({ disabled: this.props.page === 0 }) }>
                            <a onClick={ this.previousPage }>&laquo; Previous</a>
                        </li>
                        <li className='disabled'><a>Page { parseInt(this.props.page) + 1 }</a></li>
                        <li className={ classNames({ disabled: this.props.jobs.length < PAGE_SIZE }) }>
                            <a onClick={ this.nextPage }>Next &raquo;</a>
                        </li>
                    </ul>
                </nav>
            </div>
        );
    }

    rowGetter = (i) => {
        return this.props.jobs[i];
    }

    onRowsSelected = (rows) => {
        this.props.setSelectedIds(this.props.selectedIds.concat(rows.map(r => r.row.id)));
        this.props.updateJobsQueryParams();
    }

    onRowsDeselected = (rows) => {
        const rowIds = rows.map(r => r.row.id);
        this.props.setSelectedIds(this.props.selectedIds.filter(i => rowIds.indexOf(i) === -1 ));
        this.props.updateJobsQueryParams();
    }

    onGridSort = (sortColumn, sortDirection) => {
        this.props.setParams({sortColumn, sortDirection});
    }

    killJobs = () => {
        this.props.killJobs(this.props.selectedIds)
            .then(() => this.props.fetchJobsPage())
            .catch(() => {});
    }

    previousPage = () => {
        if (this.props.page > 0) {
            this.props.setParams({ page: this.props.page - 1 });
        }
    }

    nextPage = () => {
        if (this.props.jobs.length === PAGE_SIZE) {
            this.props.setParams({ page: this.props.page + 1 });
        }
    }

    handleStatusChange = (newStatus) => {
        this.props.setParams({ selectedStatus: newStatus });
    }

    handleQueueChange = (newQueue) => {
        this.props.setParams({ selectedQueue: newQueue });
    }

    // Load query params into store, resetting any values with defaults
    loadStateFromQueryParams = () => {
        const query = this.props.routing.locationBeforeTransitions.query;
        const queryParamsWithDefaults = {
            ...QUERY_PARAM_DEFAULTS,
            ...query,
            page: query.page ? parseInt(query.page) : 0,
            selectedIds: query.selectedIds ? query.selectedIds.split(',') : []
        };
        this.props.setParams(queryParamsWithDefaults);
    }

    setAutoRefresh = (e) => {
        const autoRefresh = e.target.checked;
        this.state.autoRefresh = autoRefresh;
        this.setState({ autoRefresh });
        this.autoRefresh();
    }

    autoRefresh = () => {
        if (this.state.autoRefresh) {
            this.props.fetchJobsPage().then(() => {
                setTimeout(() => {
                    this.autoRefresh();
                }, AUTO_REFRESH_TIMEOUT);
            });
        }
    }
}

const mapStateToProps = state => ({
    q: state.job.q,
    jobs: state.job.jobs,
    page: state.job.page,
    height: state.layout.height,
    queues: state.job.queues,
    routing: state.routing,
    selectedIds: state.job.selectedIds,
    selectedQueue: state.job.selectedQueue,
    selectedStatus: state.job.selectedStatus,
    status: state.status[JOBS],
    sortColumn: state.job.sortColumn,
    sortDirection: state.job.sortDirection,
});

const actions = {
    fetchJobsPage,
    killJobs,
    setSelectedIds,
    setParams,
    syncJobQueues,
    updateJobsQueryParams
};

export default connect(mapStateToProps, actions)(JobsPage);
