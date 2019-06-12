import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import {
    fetchStatsPage,
    setStartDate,
    setEndDate,
} from 'stores/job';
import { STATS } from 'stores/status';
import DateTime from 'react-datetime';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import './StatsPage.scss';
import 'react-datetime/css/react-datetime.css';

const DATE_FORMAT = 'YYYY-MM-DD';
const TIME_FORMAT = 'hh:mm:ss A';
const METRICS = [
    'vcpu_seconds',
    'memory_seconds',
    'instance_seconds'
];

class StatsPage extends React.Component {
    static propTypes = {
        endDate: PropTypes.instanceOf(Date),
        fetchStatsPage: PropTypes.func.isRequired,
        startDate: PropTypes.instanceOf(Date),
        stats: PropTypes.array.isRequired,
        status: PropTypes.object.isRequired,
        setStartDate: PropTypes.func.isRequired,
        setEndDate: PropTypes.func.isRequired,
    };

    componentDidMount() {
        this.props.fetchStatsPage();
    }

    render() {
        const {
            status
        } = this.props;

        if (status.loading) {
            return <div className='stats-page' />;
        }

        if (!status.loading && status.error) {
            return (
                <div className='stats-page'>
                    <div className='alert alert-danger'>
                        Could not load API response for stats.
                    </div>
                </div>
            );
        }

        const [grouped, jobQueues] = this.mapStats(this.props.stats);
        console.log({grouped});

        return (
            <div className='stats-page'>
                <div className='actions'>
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

                <div className='area-chart'>
                    <AreaChart
                        width={ 500 }
                        height={ 400 }
                        data={ grouped }
                        margin={ {
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        } }
                    >
                        <CartesianGrid strokeDasharray='3 3' />
                        <XAxis dataKey='timestamp' />
                        <YAxis />
                        <Tooltip />
                        { jobQueues.map(jobQueue => {
                            const key = jobQueue + '_vcpu_seconds';
                            return <Area
                                type='monotone'
                                key={ key }
                                dataKey={ key }
                                stackId='1'
                            />
                        }) }

                    </AreaChart>
                </div>
            </div>
        );
    }

    mapToDate = (fn) => (momentDate) => {
        return fn(momentDate.toDate());
    }

    mapStats = (stats) => {
        const grouped = {};
        const jobQueues = {}
        stats.forEach(stat => {
            jobQueues[stat.job_queue] = true;

            if (!grouped[stat.timestamp]) {
                grouped[stat.timestamp] = {
                    timestamp: stat.timestamp
                };
            }

            const metricsForQueue = {};

            METRICS.forEach(metric => {
                const keyName = stat.job_queue + '_' + metric;
                metricsForQueue[keyName] = stat[metric];
            });

            grouped[stat.timestamp] = {
                ...grouped[stat.timestamp],
                ...metricsForQueue
            };
        });

        const flattened = Object.keys(grouped).sort().map(timestamp => grouped[timestamp]);
        const jobQueuesFlattened = Object.keys(jobQueues);
        return [flattened, jobQueuesFlattened];
    }
}

const mapStateToProps = state => ({
    stats: state.job.stats,
    status: state.status[STATS],
    startDate: state.job.startDate,
    endDate: state.job.endDate,
});

const actions = {
    fetchStatsPage,
    setStartDate,
    setEndDate
};

export default connect(mapStateToProps, actions)(StatsPage);
