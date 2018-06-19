import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import ReactDataGrid from 'react-data-grid';
import {
    fetchJobsPage,
    killJobs,
    setSelectedIds,
    setAndFetch,
    syncJobQueues,
    updateJobsQueryParams,
    QUERY_PARAM_DEFAULTS,
    STATUS_LABELS,
    STATUS_ORDER
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
import Select from 'react-select';
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
        syncJobQueues: PropTypes.func.isRequired,
        jobs: PropTypes.array.isRequired,
        killJobs: PropTypes.func.isRequired,
        height: PropTypes.number.isRequired,
        routing: PropTypes.object.isRequired,
        selectedIds: PropTypes.array.isRequired,
        setSelectedIds: PropTypes.func.isRequired,
        setAndFetch: PropTypes.func.isRequired,
        status: PropTypes.object.isRequired,
        updateJobsQueryParams: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        // Using state for autoRefresh so it resets to false on navigation
        this.state = {
            autoRefresh: false,
            selectedStatus: '',
            selectedQueue: '',
        };
    }

    componentDidMount() {
        this.loadStateFromQueryParams();
        this.props.syncJobQueues();
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

        const statusOptions = STATUS_ORDER.map(s => ({ label: s, value: s }));
        const queuesOptions = queues.map(q => ({ label: q, value: q }));

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
                    <div className='status-selector'>
                        <Select
                            closeOnSelect={false}
                            removeSelected={true}
                            disabled={false}
                            multi
                            onChange={this.handleStatusChange}
                            options={statusOptions}
                            placeholder="Status"
                            value={this.state.selectedStatus}
                            simpleValue
                        />
                    </div>
                    <div className='queues-selector'>
                        <Select
                            closeOnSelect={false}
                            removeSelected={true}
                            disabled={false}
                            multi
                            onChange={this.handleQueueChange}
                            options={queuesOptions}
                            placeholder="Queues"
                            value={this.state.selectedQueue}
                            simpleValue
                        />
                    </div>
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
        this.props.setAndFetch({sortColumn, sortDirection});
    }

    killJobs = () => {
        this.props.killJobs(this.props.selectedIds)
            .then(() => this.props.fetchJobsPage())
            .catch(() => {});
    }

    previousPage = () => {
        if (this.props.page > 0) {
            this.props.setAndFetch({ page: this.props.page - 1 });
        }
    }

    nextPage = () => {
        if (this.props.jobs.length === PAGE_SIZE) {
            this.props.setAndFetch({ page: this.props.page + 1 });
        }
    }

    handleStatusChange = (newStatus) => {
        this.props.setAndFetch({ selectedStatus: newStatus });
        this.setState({ selectedStatus: newStatus});
    }
    handleQueueChange = (newQueue) => {
        this.props.setAndFetch({ selectedQueue: newQueue });
        this.setState({ selectedQueue: newQueue});
    }

    // Load query params into store, resetting any values with defaults
    loadStateFromQueryParams = () => {
        const query = this.props.routing.locationBeforeTransitions.query;
        const queryParamsWithDefaults = {
            ...QUERY_PARAM_DEFAULTS,
            ...query,
            selectedIds: query.selectedIds ? query.selectedIds.split(',') : []
        };
        this.props.setAndFetch(queryParamsWithDefaults);
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
    jobs: state.job.jobs,
    page: state.job.page,
    height: state.layout.height,
    queues: state.job.queues,
    routing: state.routing,
    selectedIds: state.job.selectedIds,
    status: state.status[JOBS]
});

const actions = {
    fetchJobsPage,
    killJobs,
    setSelectedIds,
    setAndFetch,
    syncJobQueues,
    updateJobsQueryParams
};

export default connect(mapStateToProps, actions)(JobsPage);
