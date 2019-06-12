import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import {
    setSelectedStatus,
    STATUS_ORDER
} from 'stores/job';
import Select from 'react-select';
import './StatusSelector.scss';

const STATUS_OPTIONS = STATUS_ORDER.map(s => ({ label: s, value: s }));

class StatusSelector extends React.Component {
    static propTypes = {
        selectedStatus: PropTypes.string.isRequired,
        setSelectedStatus: PropTypes.func.isRequired
    };

    render() {

        return (
            <div className='status-selector'>
                <Select
                    closeOnSelect={ false }
                    removeSelected={ true }
                    disabled={ false }
                    multi
                    onChange={ this.props.setSelectedStatus }
                    options={ STATUS_OPTIONS }
                    placeholder='Status'
                    value={ this.props.selectedStatus }
                    simpleValue
                />
            </div>
        );
    }
};


const mapStateToProps = state => ({
    selectedStatus: state.job.selectedStatus
});

const actions = {
    setSelectedStatus
};

export default connect(mapStateToProps, actions)(StatusSelector);
