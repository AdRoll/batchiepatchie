import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import debounce from 'utils/debounce';
import {
    setParams,
    setLocationToSearch,
    setSearch
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
        q: PropTypes.string.isRequired,
        setParams: PropTypes.func.isRequired,
        setSearch: PropTypes.func.isRequired,
        statusKey: PropTypes.string.isRequired,
    };

    render() {
        const {
            loading,
            q
        } = this.props;

        return (
            <div className='search container-fluid'>
                <div className='row'>
                    <div className='col-md-3'>
                        { loading && <SectionLoader /> }
                    </div>
                    <div className='col-md-9'>
                        <div className='input-group'>
                            <span className='input-group-addon'>
                                <i className='fa fa-search' />
                            </span>
                            <input
                                type='text'
                                className='form-control'
                                onChange={ this.onChange }
                                onKeyPress={ this.handleKeyPress }
                                value={ q }
                                placeholder='Search Jobs...'
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    onChange = (e) => {
        this.props.setSearch(e.target.value);

        if (this.props.statusKey === JOBS) {
            this.fetchJobsPage();
        }
    }

    fetchJobsPage = debounce(() => {
        this.props.setParams({q: this.props.q});
    }, 300)

    handleKeyPress = (e) => {
        if (e.key === 'Enter' && this.props.statusKey !== JOBS) {
            this.props.setLocationToSearch();
        }
    }
};

const mapStateToProps = state => {
    const statusKey = getStatusKey(state.routing.locationBeforeTransitions.pathname);
    return {
        statusKey,
        q: state.job.q,
        loading: state.status[statusKey].loading
    };
};

const actions = {
    setParams,
    setLocationToSearch,
    setSearch
};

export default connect(mapStateToProps, actions)(Search);
