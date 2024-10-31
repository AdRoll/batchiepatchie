import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import ReactTooltip from 'react-tooltip';
import debounce from 'utils/debounce';
import {
    setParams,
    setLocationToSearch
} from 'stores/job';
import SectionLoader from 'components/SectionLoader/SectionLoader';
import {
    JOB,
    JOBS,
    STATS
} from 'stores/status';
import './Search.scss';

// Fuels top of the page loading spinner
function getStatusKey(path) {
    if (path.startsWith('/job')) {
        return JOB;
    } else if (path.startsWith('/stats')) {
        return STATS;
    }
    return JOBS;
}

class Search extends React.Component {
    static propTypes = {
        loading: PropTypes.bool.isRequired,
        qTemp: PropTypes.string.isRequired,
        dateRange: PropTypes.string.isRequired,
        setParams: PropTypes.func.isRequired,
        statusKey: PropTypes.string.isRequired,
    };

    render() {
        const {
            loading,
            qTemp,
            dateRange
        } = this.props;

        return (
            <div className='search container-fluid'>
                <div className='row'>
                    <div className='col-md-3'>
                        { loading && <SectionLoader /> }
                    </div>
                    <div className='col-md-3'>
                        <select
                            className="form-control"
                            value={dateRange}
                            onChange={this.onDateRangeChanged}
                        >
                            <option value="10m">The past 10 minutes</option>
                            <option value="1h">The past hour</option>
                            <option value="1d">The past day</option>
                            <option value="2d">The past 2 days</option>
                            <option value="3d">The past 3 days</option>
                            <option value="7d">The past 7 days</option>
                            <option value="30d">The past 30 days</option>
                        </select>
                    </div>
                    <div className='col-md-6'>
                        <div className='input-group'>
                            <span className='input-group-addon'>
                                <i className='fa fa-search' />
                            </span>
                            <input
                                type='text'
                                className='form-control'
                                onChange={ this.onChange }
                                onKeyPress={ this.onKeyPress }
                                value={ qTemp }
                                placeholder='Search Jobs...'
                            />
                            <div className='search-info'>
                                <div data-tip data-for="aboutSearch">
                                    ℹ️
                                </div>

                                <ReactTooltip id="aboutSearch" place="left" effect="solid">
                                    Search is case-insensitive, partial-word, AND search on individual words.<br />
                                    The following fields are searched: ID, Name, Image, and Queue.
                                </ReactTooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    onChange = (e) => {
        this.props.setParams({qTemp: e.target.value});
        this.search(e.target.value);
    }

    onDateRangeChanged = (e) => {
        this.props.setParams({dateRange: e.target.value});
    }

    search = debounce((q) => {
        this.props.setParams({q});
    }, 500)

    onKeyPress = (e) => {
        if (e.key === 'Enter' && this.props.statusKey !== JOBS) {
            this.props.setLocationToSearch();
        }
    }
};

const mapStateToProps = state => {
    const statusKey = getStatusKey(state.routing.locationBeforeTransitions.pathname);
    return {
        statusKey,
        qTemp: state.job.qTemp,
        dateRange: state.job.dateRange,
        loading: state.status[statusKey].loading
    };
};

const actions = {
    setParams,
    setLocationToSearch
};

export default connect(mapStateToProps, actions)(Search);
