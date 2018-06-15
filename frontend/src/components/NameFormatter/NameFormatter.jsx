import React, { PropTypes } from 'react';

export default class NameFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.string.isRequired,
        id: PropTypes.string
    };

    render() {
        const name = this.props.value;
        const adaptedNameSplit = name.split('-');
        let adaptedName = adaptedNameSplit.slice(2, adaptedNameSplit.length).join('-')
        const id = this.props.id;

        /* drop pybatch prefix if it's there; it's just noise */
        if (!name.startsWith("pybatch-")) {
            adaptedName = name;
        }

        return (
            <span>{ adaptedName }{ id && <span>&nbsp;({ id })</span> }</span>
        );
    }
};
