import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import classNames from 'classnames';
import {
    STATUS_ORDER,
    fetchJobLogs,
    fetchJobPage,
    killJobs
} from 'stores/job';
import {
    JOB,
    LOGS
} from 'stores/status';
import NameFormatter from 'components/NameFormatter/NameFormatter';
import StatusFormatter from 'components/StatusFormatter/StatusFormatter';
import DateTimeFormatter from 'components/DateTimeFormatter/DateTimeFormatter';
import DurationFormatter from 'components/DurationFormatter/DurationFormatter';
import SectionLoader from 'components/SectionLoader/SectionLoader';
import Terminal from 'components/Terminal/Terminal';
import SearchBox from 'components/SearchBox/SearchBox';
import numeral from 'numeral';
import './JobPage.scss';

class JobPage extends React.Component {
    static propTypes = {
        fetchJobLogs: PropTypes.func.isRequired,
        fetchJobPage: PropTypes.func.isRequired,
        killJobs: PropTypes.func.isRequired,
        job: PropTypes.object.isRequired,
        logStatus: PropTypes.object.isRequired,
        height: PropTypes.number.isRequired,
        params: PropTypes.object.isRequired,
        status: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            autoScrollToBottom: true,
            // Search text to highlight.
            searchText: '',
            // Index of the row with the current search result, or -1 if not found.
            currentSearchRow: -1,
        };
    }

    componentDidMount() {
        this.props.fetchJobPage(this.props.params.id);
        this.props.fetchJobLogs(this.props.params.id);
        this.interval = setInterval(() => {
            this.props.fetchJobLogs(this.props.params.id);
        }, 10000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    render() {
        const {
            params: {
                id
            },
            job: {
                jobsById,
                logsById
            },
            logStatus,
            height,
            status
        } = this.props;
        const { autoScrollToBottom, searchText, currentSearchRow } = this.state;

        const job = jobsById[id];
        let jobRegion = (job === undefined || job === null || job.task_arn === null) ? null : job.task_arn.split(":")[3];
        if (!jobRegion && job && job.desc) {
            const matches = /^arn:aws:batch:([^:]+)/.exec(job.desc);
            if (matches) {
                jobRegion = matches[1];
            }
        }
        const log = logsById[id] ? logsById[id].map(entry => entry.Message) : [];
        const terminalHeight = height - 440;

        if (status.loading) {
            return <div className='job-page' />;
        }

        if ((!status.loading && status.error) || job === undefined) {
            return (
                <div className='job-page'>
                    <div className='alert alert-danger'>
                        Could not load API response for job.
                    </div>
                </div>
            );
        }

        let exitcode_explanation = '';
        switch(job.exitcode) {
            case 0:
            exitcode_explanation = '(success)';
            break;
            case 126:
            exitcode_explanation = '(contained command cannot be invoked)';
            break;
            case 127:
            exitcode_explanation = '(contained command not found)';
            break;
            case 137:
            exitcode_explanation = '(docker SIGKILL)';
            break;
            case 130:
            exitcode_explanation = '(docker SIGINT)';
            break;
            case 143:
            exitcode_explanation = '(docker SIGTERM)';
            break;
        }

        let termination_requested = 'No';
        if ( job.termination_requested === true ) {
            termination_requested = 'Yes';
        }

        return (
            <div className='job-page'>
                <div className='container-fluid'>
                    <div className='row'>
                        <div className='col-md-12'>
                            <h2><NameFormatter value={ job.name } id={ job.id } dependentValues={ job } /></h2>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <strong>Status</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Last Updated</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Created At</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Stopped At</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <StatusFormatter value={ job.status } />
                            {job.array_properties &&
                                <div className='status-formatter'>
                                    <div className='alert alert-gone'>
                                        Array Job
                                    </div>
                                </div>
                            }
                            {job.array_properties &&
                                <div className='child-array-job-statuses'>
                                    {
                                        STATUS_ORDER.map((status) => {
                                            const count = job.array_properties.status_summary[status.toLowerCase()];
                                            return count > 0 && <StatusFormatter count={ count } value={ status } key={ status } />
                                        })
                                    }
                                </div>
                            }
                        </div>
                        <div className='col-md-3'>
                            <DateTimeFormatter value={ job.last_updated } />
                        </div>
                        <div className='col-md-3'>
                            <DateTimeFormatter value={ job.created_at } />
                        </div>
                        <div className='col-md-3'>
                            <DateTimeFormatter value={ job.stopped_at } />
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <strong>Runtime</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Total Elapsed</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>ID</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Name</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <DurationFormatter value={ job.runtime } />
                        </div>
                        <div className='col-md-3'>
                            <DurationFormatter value={ job.total_elapsed_time } />
                        </div>
                        <div className='col-md-3'>
                            { job.id }
                        </div>
                        <div className='col-md-3'>
                            { job.name }
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <strong>Queue</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>CPUs</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Memory</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Timeout</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            { job.job_queue }
                        </div>
                        <div className='col-md-3'>
                            { job.vcpus }
                        </div>
                        <div className='col-md-3'>
                            { job.memory } MB
                        </div>
                        <div className='col-md-3'>
                            { numeral(job.timeout).format('0,0') } s
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <strong>Container Image</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Description</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Exit code</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Stopped Reason</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            { job.image }
                        </div>
                        <div className='col-md-3'>
                            { job.desc }
                        </div>
                        <div className='col-md-3'>
                            { job.exitcode } { exitcode_explanation }
                        </div>
                        <div className='col-md-3'>
                            { job.status_reason }
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            <strong>Termination requested</strong>
                        </div>
                        <div className='col-md-3'>
                            <strong>Actions</strong>
                        </div>
                        <div className='col-md-3'>
                          <strong>ECS Task ARN</strong>
                        </div>
                        <div className='col-md-3'>
                          <strong>Private IP</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-3'>
                            { termination_requested }
                        </div>
                        <div className='col-md-3'>
                            <button className='btn btn-xs btn-danger' onClick={ this.killJob }>
                                Kill Job
                            </button>
                            <a
                                href={process.env.BASE_URL + "/api/v1/jobs/" + this.props.params.id  + "/logs?format=text"}
                                download={ this.props.params.id.substr(0, 8) + ".txt" }
                            >
                                <button className='btn btn-xs btn-info'>
                                    Download Logs
                                </button>
                            </a>
                            {job.log_stream_name === null || jobRegion === null ? <span /> :
                            <a
                                href={
                                    "https://" +
                                    jobRegion +
                                    ".console.aws.amazon.com/cloudwatch/home?region=" +
                                    jobRegion +
                                    "#logEventViewer:group=/aws/batch/job;stream=" +
                                    job.log_stream_name
                                }
                                target="_blank"
                            >
                                <button className='btn btn-xs btn-dark'>
                                    Show logs in CloudWatch
                                </button>
                            </a>
                            }
                            {job.id === null || jobRegion === null ? <span /> :
                            <a
                                href={
                                    "https://" +
                                    jobRegion +
                                    ".console.aws.amazon.com/batch/home?region=" +
                                    jobRegion +
                                    "#jobs/detail/" +
                                    job.id
                                }
                                target="_blank"
                            >
                                <button className='btn btn-xs btn-warning'>
                                    Show in AWS Batch
                                </button>
                            </a>
                            }
                        </div>
                        <div className='col-md-3'>
                          { job.task_arn }
                        </div>
                        <div className='col-md-3'>
                          { job.private_ip }
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-6'>
                          <strong>Public IP</strong>
                        </div>
                        <div className='col-md-6'>
                          <strong>Instance ID</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-6'>
                          { job.public_ip }
                        </div>
                        <div className='col-md-6'>
                          { job.instance_id }
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-12'>
                            <strong>Command</strong>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-12'>
                            <pre>{ job.command_line }</pre>
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-12'>
                            <h2>Logs</h2>
                            <label className="auto-scroll-checkbox">
                                <input type="checkbox"
                                    checked={autoScrollToBottom}
                                    onChange={() => this.setState({autoScrollToBottom: !autoScrollToBottom})}
                                />
                                Auto-scroll to bottom
                            </label>
                            <SearchBox
                                rows={ log }
                                onSearchChanged={(searchText, currentSearchRow) => this.setState(
                                    {searchText, currentSearchRow, autoScrollToBottom: false})}
                            />
                            { logStatus.loading && <SectionLoader /> }
                        </div>
                    </div>

                    <div className='row'>
                        <div className='col-md-12'>
                            <Terminal
                                log={ log }
                                height={ terminalHeight }
                                autoScrollToBottom={ autoScrollToBottom }
                                searchText={ searchText }
                                currentSearchRow={ currentSearchRow }
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    killJob = () => {
        this.props.killJobs([this.props.params.id])
            .then(() => this.props.fetchJobPage(this.props.params.id))
            .catch(() => {});
    }
}

const mapStateToProps = state =>({
    job: state.job,
    logStatus: state.status[LOGS],
    height: state.layout.height,
    status: state.status[JOB]
});

const actions = {
    fetchJobLogs,
    fetchJobPage,
    killJobs
};

export default connect(mapStateToProps, actions)(JobPage);
