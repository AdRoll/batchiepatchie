import React, { PropTypes } from 'react';
import './ActivationFormatter.scss';

export default class ActivationFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.object
    };

    render() {
        const value = this.props.value.action;

        let classes = 'btn btn-xs btn-success';
        if ( value === 'DEACTIVATE' ) {
            classes = 'btn btn-xs btn-danger';
        }

        if ( value !== '' ) {
            return (
                <div className='activation-formatter-btn'>
                  <button className={classes} onClick={this.props.value.onClick}>
                    {value}
                  </button>
                </div>
            );
        } else {
            return (<span></span>);
        }
    }
};
