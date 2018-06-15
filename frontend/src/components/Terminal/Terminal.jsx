import React, { PropTypes } from 'react';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import List from 'react-virtualized/dist/commonjs/List';
import Highlighter from "react-highlight-words";
import './Terminal.scss';

const LOG_ROW_HEIGHT = 18;
const CHAR_WIDTH = 8;

export default class Terminal extends React.Component {
    static propTypes = {
        height: PropTypes.number.isRequired,
        log: PropTypes.array.isRequired
    };

    render() {
        const { log, height } = this.props;
        const maxLength = log.reduce((memo, item) => Math.max(memo, item.length), 0);

        return (
            <div className='terminal'>
                <AutoSizer disableHeight>
                    { ({ width }) => (
                        <List
                            ref='List'
                            height={ height }
                            overscanRowCount={ 30 }
                            noRowsRenderer={ this.noRowsRenderer }
                            rowCount={ log.length }
                            rowHeight={ LOG_ROW_HEIGHT }
                            rowRenderer={ this.rowRenderer }
                            width={ Math.max(width, maxLength * CHAR_WIDTH) }
                        />
                    ) }
                </AutoSizer>
            </div>
        );
    }

    rowRenderer = ({ index, key, style }) => {
        return (
            <pre key={ key } style={ style }>
                <Highlighter
                    highlightClassName="error"
                    searchWords={ [
                        "ERROR",
                        "WARNING",
                    ] }
                    textToHighlight={ this.props.log[index] }/>
            </pre>)
    }

    noRowsRenderer = () => {
        return <pre className='no-rows'>No logs, possibly loading them...</pre>;
    }
}
