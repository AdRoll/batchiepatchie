import React, { PropTypes } from 'react';
import { Link } from 'react-router';

export default class JobLinkFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number,
        ]).isRequired
    };

    render() {
        const value = this.props.value;

        /*
         * Don't display the entire ID (it's kind of long).
         *
         * All JobIDs have predictable format so we'll take just first 8 characters.
         *
         * 35c55019-c25d-4de6-9338-27c678495df -> 35c55019
         */
        
        const value_prefix = value.substr(0, 8);

        return (
            <div className='job-link-formatter'>
                <Link to={ `/job/${value}` }>{ value_prefix }</Link>
            </div>
        );
    }
};
