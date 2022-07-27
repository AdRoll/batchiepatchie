import React, { PropTypes } from 'react';
import ReactTooltip from 'react-tooltip';

export default class NameFormatter extends React.Component {
    static propTypes = {
        value: PropTypes.string.isRequired,
        // dependentValues contains the row. It is typically set using getRowMetaData.
        dependentValues: PropTypes.object,
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
        const job = this.props.dependentValues;
        return (
            <span>
                { job && job.array_properties &&
                    <span>
                        <span data-tip data-for="aboutArrayJob" className="array-job-icon">
                            ◱
                        </span>
                        <ReactTooltip id="aboutArrayJob" place="right" effect="solid">
                            Parent Array Job
                        </ReactTooltip>
                    </span>
                }
                { adaptedName }
                { id && <span>&nbsp;({ id })</span> }
                </span>
        );
    }
};
