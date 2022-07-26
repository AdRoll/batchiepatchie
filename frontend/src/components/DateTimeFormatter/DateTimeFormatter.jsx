import React, { PropTypes } from 'react';
import moment from 'moment';

export default class DateTimeFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.string
    };

    render() {
        const dt = moment.utc(this.props.value);
        const dtStr = dt.isValid() ? `${dt.format('YYYY-MM-DD h:mm:ss a z')} (${dt.fromNow()})` : '';

        return (
            <div className='datetime-formatter'>
                { dtStr }
            </div>
        );
    }
};
