import React, { PropTypes } from 'react';

export default class TerminationRequestedFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.bool.isRequired
    };

    render() {
        const value = this.props.value;

        if ( value ) {
            return <span>🔪</span>;
        } else {
            return <span></span>;
        }
    }
}

