import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import {
    setSelectedStatus,
    STATUS_ORDER
} from 'stores/job';
import Select from 'react-select';
import './StatusSelector.scss';

class StatusSelector extends React.Component {
    static propTypes = {
        selectedStatus: PropTypes.string.isRequired,
        setSelectedStatus: PropTypes.func.isRequired,
        statusOrder: PropTypes.array,
    };

    render() {
        const statusOrder = this.props.statusOrder || STATUS_ORDER;
        const statusOptions = statusOrder.map(s => ({ label: s, value: s }));

        return (
            <div className='status-selector'>
                <Select
                    closeOnSelect={ false }
                    removeSelected={ true }
                    disabled={ false }
                    multi
                    onChange={ this.props.setSelectedStatus }
                    options={ statusOptions }
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
