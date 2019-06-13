import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import {
    fetchStatsPage,
    setEndDate,
    setParams,
    setStartDate,
    setStatsMetric,
    syncJobQueues,
    updateJobsQueryParams,
    QUERY_PARAM_DEFAULTS,
    STATUS_ORDER,
    STATS_METRICS,
    STATS_METRICS_LABELS,
    STATS_METRICS_ORDER,
} from 'stores/job';
import { STATS } from 'stores/status';
import moment from 'moment';
import humanizeDuration from 'humanize-duration';
import DateTime from 'react-datetime';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import QueueSelector from 'components/QueueSelector/QueueSelector';
import StatusFormatter from 'components/StatusFormatter/StatusFormatter';
import StatusSelector from 'components/StatusSelector/StatusSelector';
import getChartColor from 'utils/getChartColor';
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

const HUMANIZE_OPTS = {
    largest: 2,
    round: true
};

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
        statsMetric: PropTypes.string.isRequired,
    };

    componentDidMount() {
        this.loadStateFromQueryParams();
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

        if (this.props.statsMetric !== prevProps.statsMetric) {
            this.props.updateJobsQueryParams();
        }
    }

    render() {
        const {
            stats,
            status,
            startDate,
            endDate,
            statsMetric,
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
            totalData,
            jobQueues
        ] = this.mapStats(stats);

        const timeBetween = (endDate.getTime() - startDate.getTime()) / 1000;

        return (
            <div className='stats-page'>
                <div className='actions'>
                    <StatusSelector statusOrder={ ['SUCCEEDED', 'FAILED'] } />
                    <QueueSelector />
                    <label>
                        Metric
                        <select className='form-control metric-picker' value={ statsMetric } onChange={ this.setStatsMetric }>
                            { STATS_METRICS_ORDER.map(metric => <option key={ metric } value={ metric }>
                                { STATS_METRICS_LABELS[metric] }
                            </option>) }
                        </select>
                    </label>
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
                                    { jobQueues.map(jobQueue => {
                                        const color = getChartColor(jobQueue);
                                        const key = this.getLookupKey(jobQueue, statsMetric);
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
                                        <th>Job Rate (/hour)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { jobQueues.map(jobQueue => {
                                        const color = getChartColor(jobQueue);
                                        const statuses = Object.keys(tableData[jobQueue]).sort((a, b) => b.localeCompare(a));
                                        return statuses.map((status, statusIdx) => {
                                            const item = tableData[jobQueue][status];
                                            return this.getTableRow(jobQueue, color, timeBetween, item, status);
                                        });
                                    }) }

                                    { /* Total row */ }
                                    { stats.length > 0 && this.getTableRow('Total', '#000000', timeBetween, totalData) }
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
        const totalData = {};
        const jobQueues = {};
        stats.forEach(stat => {
            // Initialize job queue breakdown, queues are ordered by this metric
            if (!jobQueues[stat.job_queue])
                jobQueues[stat.job_queue] = 0;
            jobQueues[stat.job_queue] += stat.vcpu_seconds;

            // Initialize chart
            if (!chartData[stat.timestamp])
                chartData[stat.timestamp] = { timestamp: stat.timestamp };

            // Initialize table
            if (!tableData[stat.job_queue])
                tableData[stat.job_queue] = {};

            if (!tableData[stat.job_queue][stat.status])
                tableData[stat.job_queue][stat.status] = {};

            METRICS.forEach(metric => {
                // Aggregate chart
                const keyName = this.getLookupKey(stat.job_queue, metric);
                if (!chartData[stat.timestamp][keyName])
                    chartData[stat.timestamp][keyName] = 0;
                chartData[stat.timestamp][keyName] += stat[metric];

                // Aggregate table
                if (!tableData[stat.job_queue][stat.status][metric])
                    tableData[stat.job_queue][stat.status][metric] = 0;
                tableData[stat.job_queue][stat.status][metric] += stat[metric];

                // Aggregate total
                if (!totalData[metric])
                    totalData[metric] = 0;
                totalData[metric] += stat[metric];
            });

            // Derived chart metrics
            const avgVCPUKey = this.getLookupKey(stat.job_queue, STATS_METRICS.avg_vcpu);
            const avgMemoryKey = this.getLookupKey(stat.job_queue, STATS_METRICS.avg_memory);
            const vcpuSecondsKey = this.getLookupKey(stat.job_queue, STATS_METRICS.vcpu_seconds);
            const memorySecondsKey = this.getLookupKey(stat.job_queue, STATS_METRICS.memory_seconds);
            const instanceSecondsKey = this.getLookupKey(stat.job_queue, STATS_METRICS.instance_seconds);
            chartData[stat.timestamp][avgVCPUKey] = chartData[stat.timestamp][vcpuSecondsKey] / chartData[stat.timestamp][instanceSecondsKey];
            chartData[stat.timestamp][avgMemoryKey] = chartData[stat.timestamp][memorySecondsKey] / chartData[stat.timestamp][instanceSecondsKey];
        });

        const chartDataFlat = Object.keys(chartData).sort().map(timestamp => {
            return chartData[timestamp];
        });

        const jobQueuesSorted = Object.keys(jobQueues).sort((a, b) => jobQueues[b] - jobQueues[a]);
        return [chartDataFlat, tableData, totalData, jobQueuesSorted];
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
            statsMetric: query.statsMetric || QUERY_PARAM_DEFAULTS.statsMetric,
        };
        this.props.setParams(queryParamsWithDefaults);
    }

    getTableRow = (label, color, timeBetween, item, status) => {
        return <tr>
            <td>
                <div className='color-block' style={ { backgroundColor: color } } />
                { label }
            </td>
            <td className='status-column'>{ status && <StatusFormatter value={ status } /> }</td>
            <td>{ item.job_count }</td>
            <td>{ humanizeDuration(item.instance_seconds * 1000, HUMANIZE_OPTS) }</td>
            <td>{ humanizeDuration(item.vcpu_seconds * 1000, HUMANIZE_OPTS) }</td>
            <td>{ humanizeDuration(item.instance_seconds * 1000 / item.job_count, HUMANIZE_OPTS) }</td>
            <td>{ (item.vcpu_seconds / item.instance_seconds).toFixed(1) }</td>
            <td>{ (item.memory_seconds / item.instance_seconds / 1000).toFixed(1) }</td>
            <td>{ (item.vcpu_seconds / timeBetween).toFixed(1) }</td>
            <td>{ (item.memory_seconds / timeBetween / 1000).toFixed(1) }</td>
            <td>{ (item.job_count / timeBetween * 3600).toFixed(1) }</td>
        </tr>;
    }


    setStatsMetric = (event) => {
        this.props.setStatsMetric(event.target.value);
    }

    getLookupKey = (queue, metric) => `${queue}_${metric}`;
}

const mapStateToProps = state => ({
    endDate: state.job.endDate,
    routing: state.routing,
    selectedQueue: state.job.selectedQueue,
    selectedStatus: state.job.selectedStatus,
    startDate: state.job.startDate,
    stats: state.job.stats,
    statsMetric: state.job.statsMetric,
    status: state.status[STATS],
});

const actions = {
    fetchStatsPage,
    setEndDate,
    setParams,
    setStartDate,
    setStatsMetric,
    syncJobQueues,
    updateJobsQueryParams,
};

export default connect(mapStateToProps, actions)(StatsPage);
