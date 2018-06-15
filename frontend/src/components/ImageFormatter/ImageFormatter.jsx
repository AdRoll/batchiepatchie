import React, { PropTypes } from 'react';
import './ImageFormatter.scss';

const ECR_REGEX = /^[0-9]+\.dkr\.ecr\.[^.]+\.amazonaws.com\/(.+)$/;

export default class ImageFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.string.isRequired
    };

    render() {
        let value = this.props.value;
        const re_match = value.match(ECR_REGEX);
        if ( re_match && re_match.length > 1 ) {
            value = re_match[1];
        }

        return (
            <div className='image-formatter'>
                { value }
            </div>
        );
    }
};

