import React, { PropTypes } from 'react';
import moment from 'moment';

export default class DurationFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.object
    };

    render() {
        const dt = this.props.value;
        if ( !dt ) {
            return <div></div>;
        }

        let dtStr = '';

        if ( dt.asSeconds() < 60 ) {
            const secs = Math.round(dt.asSeconds());
            dtStr = secs.toString() + " second" + (secs === 1 ? "" : "s");
        } else if ( dt.asSeconds() < 1 ) {
            const millis = Math.round(dt.asMilliseconds());
            dtStr = millis.toString() + " millisecond" + (millis === 1 ? "" : "s");
        } else if ( dt.asMinutes() < 60 ) {
            const minutes = Math.round(dt.asMinutes());
            dtStr = minutes.toString() + " minute" + (minutes === 1 ? "" : "s");
        } else if ( dt.asHours() < 24 ) {
            dtStr = dt.hours().toString() + " h " + dt.minutes().toString() + " min";
        } else {
            /* If humanize didn't round TOO much we'd just use it directly
             * instead of using all that custom formatting above. */
            dtStr = dt.humanize();
        }

        return (
            <div> { dtStr } </div>
        );
    }
};

