import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import { setSelectedQueue } from 'stores/job';
import Select from 'react-select';
import './QueueSelector.scss';

class QueueSelector extends React.Component {
    static propTypes = {
        queues: PropTypes.array.isRequired,
        selectedQueue: PropTypes.string.isRequired,
        setSelectedQueue: PropTypes.func.isRequired
    };

    render() {
        return (
            <div className='queue-selector'>
                <Select
                    closeOnSelect={ false }
                    removeSelected={ true }
                    disabled={ false }
                    multi
                    onChange={ this.props.setSelectedQueue }
                    options={ this.props.queues.sort().map(q => ({ label: q, value: q })) }
                    placeholder='Queue'
                    value={ this.props.selectedQueue }
                    simpleValue
                />
            </div>
        );
    }
};


const mapStateToProps = state => ({
    queues: state.job.queues,
    selectedQueue: state.job.selectedQueue,
});

const actions = {
    setSelectedQueue
};

export default connect(mapStateToProps, actions)(QueueSelector);
