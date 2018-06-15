import React, { PropTypes } from 'react';
import './CommandLineFormatter.scss';

export default class CommandLineFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.string
    };

    render() {
        if (!this.props.value) {
            return '';
        }

        return (
            <div className='command-line-formatter'>
                <pre>{ this.props.value }</pre>
            </div>
        );
    }
};
