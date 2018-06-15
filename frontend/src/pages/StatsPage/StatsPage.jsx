import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { fetchStatsPage } from 'stores/job';
import { STATS } from 'stores/status';
import './StatsPage.scss';

class StatsPage extends React.Component {
    static propTypes = {
        fetchStatsPage: PropTypes.func.isRequired,
        stats: PropTypes.object.isRequired,
        status: PropTypes.object.isRequired
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

        return (
            <div className='stats-page'>
                <h2>Stats</h2>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    stats: state.job.stats,
    status: state.status[STATS]
});

const actions = {
    fetchStatsPage
};

export default connect(mapStateToProps, actions)(StatsPage);
