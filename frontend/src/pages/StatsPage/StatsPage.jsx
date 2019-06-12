import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import {
    fetchStatsPage,
    setStartDate,
    setEndDate,
    setParams,
    syncJobQueues,
    updateJobsQueryParams,
    QUERY_PARAM_DEFAULTS,
    STATUS_ORDER,
} from 'stores/job';
import { STATS } from 'stores/status';
import moment from 'moment';
import humanizeDuration from 'humanize-duration';
import DateTime from 'react-datetime';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import QueueSelector from 'components/QueueSelector/QueueSelector';
import StatusFormatter from 'components/StatusFormatter/StatusFormatter';
import StatusSelector from 'components/StatusSelector/StatusSelector';
import './StatsPage.scss';
import 'react-datetime/css/react-datetime.css';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'hh:mm:ss A';
const METRICS = [
    'vcpu_seconds',
    'memory_seconds',
    'instance_seconds',
    'job_count',
];
const CHART_COLORS = [
    '#FF0000',
    '#7F0000',
    '#FFA280',
    '#806C60',
    '#FF8800',
    '#FFE1BF',
    '#996600',
    '#FFCC00',
    '#66644D',
    '#4C4700',
    '#EEFF00',
    '#FBFFBF',
    '#66FF00',
    '#7DB359',
    '#8FBFA3',
    '#005930',
    '#00FFAA',
    '#00EEFF',
    '#003C40',
    '#00AAFF',
    '#738C99',
    '#004480',
    '#0066FF',
    '#0000FF',
    '#0000BF',
    '#1A1966',
    '#C8BFFF',
    '#9559B3',
    '#CC00FF',
    '#590047',
    '#FF00AA',
    '#FFBFEA',
    '#A65369',
    '#FF4059',
    '#400009',
];

class StatsPage extends React.Component {
    static propTypes = {
        endDate: PropTypes.instanceOf(Date),
        fetchStatsPage: PropTypes.func.isRequired,
        updateJobsQueryParams: PropTypes.func.isRequired,
        routing: PropTypes.object.isRequired,
        startDate: PropTypes.instanceOf(Date),
        stats: PropTypes.array.isRequired,
        status: PropTypes.object.isRequired,
        setStartDate: PropTypes.func.isRequired,
        setEndDate: PropTypes.func.isRequired,
        syncJobQueues: PropTypes.func.isRequired,
        selectedQueue: PropTypes.string,
        selectedStatus: PropTypes.string,
    };

    componentDidMount() {
        this.loadStateFromQueryParams();
        this.props.fetchStatsPage();
        this.props.syncJobQueues();
    }

    componentDidUpdate(prevProps) {
        if (this.props.startDate.getTime() !== prevProps.startDate.getTime() ||
            this.props.endDate.getTime() !== prevProps.endDate.getTime() ||
            this.props.selectedQueue !== prevProps.selectedQueue ||
            this.props.selectedStatus !== prevProps.selectedStatus) {
            this.props.fetchStatsPage();
            this.props.updateJobsQueryParams();
        }
    }

    render() {
        const {
            stats,
            status,
            startDate,
            endDate,
        } = this.props;

        if (!status.loading && status.error) {
            return (
                <div className='stats-page'>
                    <div className='alert alert-danger'>
                        Could not load API response for stats.
                    </div>
                </div>
            );
        }

        const [
            chartData,
            tableData,
            jobQueues
        ] = this.mapStats(stats);

        const humanizeOpts = {
            largest: 2,
            round: true
        };

        const timeBetween = (endDate.getTime() - startDate.getTime()) / 1000;

        return (
            <div className='stats-page'>
                <div className='actions'>
                    <StatusSelector filterStatus={ (status) => ['SUCCEEDED', 'FAILED'].includes(status) } />
                    <QueueSelector />
                    <label>
                        Start
                        <DateTime
                            value={ this.props.startDate }
                            dateFormat={ DATE_FORMAT }
                            timeFormat={ TIME_FORMAT }
                            onChange={ this.mapToDate(this.props.setStartDate) }
                        />
                    </label>
                    <label>
                        End
                        <DateTime
                            value={ this.props.endDate }
                            dateFormat={ DATE_FORMAT }
                            timeFormat={ TIME_FORMAT }
                            onChange={ this.mapToDate(this.props.setEndDate) }
                        />
                    </label>
                </div>
                <h2>Stats</h2>
                <div className='clear' />

                <div className='container-fluid'>
                    <div className='row'>
                        <div className='col-md-12 area-chart'>
                            <ResponsiveContainer width='100%' height={ 300 }>
                                <AreaChart
                                    data={ chartData }
                                    margin={ {
                                        top: 10,
                                        right: 30,
                                        left: 0,
                                        bottom: 0,
                                    } }
                                >
                                    <CartesianGrid strokeDasharray='3 3' />
                                    <XAxis dataKey='timestamp' tickFormatter={ this.timeFormatter } />
                                    <YAxis width={ 80 } type='number' />
                                    <Tooltip
                                        formatter={ this.tooltipFormatter }
                                        labelFormatter={ this.timeFormatter }
                                        wrapperStyle={ {zIndex: 1000} }
                                    />
                                    { jobQueues.map((jobQueue, i) => {
                                        const color = CHART_COLORS[i % CHART_COLORS.length];
                                        const key = jobQueue + '_vcpu_seconds';
                                        return <Area
                                            type='monotone'
                                            key={ key }
                                            dataKey={ key }
                                            name={ jobQueue }
                                            stackId='1'
                                            fill={ color }
                                            stroke={ color }
                                            isAnimationActive={ false }
                                        />
                                    }) }

                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className='row'>

                        <div className='col-md-12'>
                            <table className='table'>
                                <thead>
                                    <tr>
                                        <th>Queue</th>
                                        <th>Status</th>
                                        <th>Job Count</th>
                                        <th>Total Job Time</th>
                                        <th>Total vCPU Time</th>
                                        <th>Avg. Job Time</th>
                                        <th>Avg. Job vCPU (cores)</th>
                                        <th>Avg. Job Memory (GB)</th>
                                        <th>Avg. vCPUs Running (cores)</th>
                                        <th>Avg. Memory Running (GB)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { jobQueues.map((jobQueue, i) => {
                                        const color = CHART_COLORS[i % CHART_COLORS.length];
                                        const statuses = Object.keys(tableData[jobQueue]).sort((a, b) => b.localeCompare(a));
                                        return statuses.map((status, statusIdx) => {
                                            const item = tableData[jobQueue][status];
                                            return <tr>
                                                <td>
                                                    <div className='color-block' style={ { backgroundColor: color } } />
                                                    { jobQueue }
                                                </td>
                                                <td><StatusFormatter value={ status } /></td>
                                                <td>{ item.job_count }</td>
                                                <td>{ humanizeDuration(item.instance_seconds * 1000, humanizeOpts) }</td>
                                                <td>{ humanizeDuration(item.vcpu_seconds * 1000, humanizeOpts) }</td>
                                                <td>{ humanizeDuration(item.instance_seconds * 1000 / item.job_count, humanizeOpts) }</td>
                                                <td>{ (item.vcpu_seconds / item.instance_seconds).toFixed(1) }</td>
                                                <td>{ (item.memory_seconds / item.instance_seconds / 1000).toFixed(1) }</td>
                                                <td>{ (item.vcpu_seconds / timeBetween).toFixed(1) }</td>
                                                <td>{ (item.memory_seconds / timeBetween / 1000).toFixed(1) }</td>
                                            </tr>;
                                        });
                                    }) }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    mapToDate = (fn) => (momentDate) => {
        return fn(momentDate.toDate());
    }

    mapStats = (stats) => {
        const chartData = {};
        const tableData = {};
        const jobQueues = {};
        stats.forEach(stat => {
            if (!jobQueues[stat.job_queue])
                jobQueues[stat.job_queue] = 0;
            jobQueues[stat.job_queue] += stat.vcpu_seconds;

            if (!chartData[stat.timestamp])
                chartData[stat.timestamp] = { timestamp: stat.timestamp };

            if (!tableData[stat.job_queue])
                tableData[stat.job_queue] = {};

            if (!tableData[stat.job_queue][stat.status])
                tableData[stat.job_queue][stat.status] = {};

            METRICS.forEach(metric => {
                const keyName = stat.job_queue + '_' + metric;
                if (!chartData[stat.timestamp][keyName])
                    chartData[stat.timestamp][keyName] = 0;
                chartData[stat.timestamp][keyName] += stat[metric];


                if (!tableData[stat.job_queue][stat.status][metric])
                    tableData[stat.job_queue][stat.status][metric] = 0;
                tableData[stat.job_queue][stat.status][metric] += stat[metric];
            });
        });

        const chartDataFlat = Object.keys(chartData).sort().map(timestamp => chartData[timestamp]);
        const jobQueuesSorted = Object.keys(jobQueues).sort((a, b) => jobQueues[b] - jobQueues[a]);
        return [chartDataFlat, tableData, jobQueuesSorted];
    }

    timeFormatter = (timestamp) => {
        return moment(timestamp * 1000).format(DATE_FORMAT + ' ' + TIME_FORMAT);
    }

    tooltipFormatter = (a) => {
        return a.toFixed(1);
    }

    formatAsHours = (seconds) => {
        return (seconds / 3600.0).toFixed(1);
    }

    // Load query params into store, resetting any values with defaults
    loadStateFromQueryParams = () => {
        const query = this.props.routing.locationBeforeTransitions.query;
        const queryParamsWithDefaults = {
            ...QUERY_PARAM_DEFAULTS,
            ...query,
            startDate: query.startDate ? moment.unix(query.startDate).toDate() : QUERY_PARAM_DEFAULTS.startDate,
            endDate: query.endDate ? moment.unix(query.endDate).toDate() : QUERY_PARAM_DEFAULTS.endDate,
        };
        this.props.setParams(queryParamsWithDefaults);
    }
}

const mapStateToProps = state => ({
    endDate: state.job.endDate,
    routing: state.routing,
    selectedQueue: state.job.selectedQueue,
    selectedStatus: state.job.selectedStatus,
    startDate: state.job.startDate,
    stats: state.job.stats,
    status: state.status[STATS],
});

const actions = {
    fetchStatsPage,
    updateJobsQueryParams,
    setStartDate,
    setEndDate,
    syncJobQueues,
    setParams,
};

export default connect(mapStateToProps, actions)(StatsPage);
