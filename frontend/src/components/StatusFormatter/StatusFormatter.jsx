import React, { PropTypes } from 'react';
import { STATUSES, STATUS_LABELS } from 'stores/job';
import './StatusFormatter.scss';

export const STATUS_CLASSES = {
    [STATUSES.SUBMITTED]: 'alert alert-info',
    [STATUSES.PENDING]: 'alert alert-info',
    [STATUSES.RUNNABLE]: 'alert alert-info',
    [STATUSES.STARTING]: 'alert alert-warning',
    [STATUSES.RUNNING]: 'alert alert-warning',
    [STATUSES.FAILED]: 'alert alert-danger',
    [STATUSES.SUCCEEDED]: 'alert alert-success',
    [STATUSES.GONE]: 'alert alert-gone',
    [STATUSES.TERMINATED]: 'alert alert-terminated'
};

export default class StatusFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.string.isRequired
    };

    render() {
        const value = this.props.value;

        return (
            <div className='status-formatter'>
                <div className={ STATUS_CLASSES[value] }>
                    { STATUS_LABELS[value] }
                </div>
            </div>
        );
    }
};
