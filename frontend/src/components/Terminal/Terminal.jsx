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
        autoScrollToBottom: PropTypes.bool.isRequired,
        // Search text to highlight.
        searchText: PropTypes.string.isRequired,
        // Index of the row with the current search result, or -1 if not found.
        currentSearchRow: PropTypes.number.isRequired,
        log: PropTypes.array.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            listKey: 0,
        };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.searchText !== this.props.searchText || prevProps.currentSearchRow !== this.props.currentSearchRow) {
            // If the search text or current search row changes, force-update the List so that the
            // Highlighter will re-render. The List is pretty aggressive about not rendering
            // when it doesn't have to.
            const { listKey } = this.state;
            this.setState({listKey: listKey + 1})
        }
        window.as = this.refs.AutoSizer;
    }

    render() {
        const { log, height, autoScrollToBottom, currentSearchRow } = this.props;
        const { listKey } = this.state;
        const maxLength = log.reduce((memo, item) => Math.max(memo, item.length), 0);
        let listProps = {};
        if (currentSearchRow > -1) {
            listProps = { scrollToIndex: currentSearchRow };
        }
        if (autoScrollToBottom) {
            listProps = { scrollToIndex: log.length-1 };
        }
        return (
            <div className='terminal'>
                <AutoSizer disableHeight ref='AutoSizer'>
                    { ({ width }) => (
                        <List
                            key={listKey}
                            height={ height }
                            overscanRowCount={ 30 }
                            noRowsRenderer={ this.noRowsRenderer }
                            rowCount={ log.length }
                            rowHeight={ LOG_ROW_HEIGHT }
                            rowRenderer={ this.rowRenderer }
                            width={ Math.max(width, maxLength * CHAR_WIDTH) }
                            {...listProps}
                        />
                    ) }
                </AutoSizer>
            </div>
        );
    }

    rowRenderer = ({ index, key, style }) => {
        const { searchText, currentSearchRow } = this.props;
        const searchWords = searchText ? [searchText] : [];
        return (
            <pre key={ key } style={ style }>
                <Highlighter
                    highlightClassName={index === currentSearchRow ? 'current-search-result' : ''}
                    searchWords={ searchWords }
                    textToHighlight={ this.props.log[index] }/>
            </pre>)
    }

    noRowsRenderer = () => {
        return <pre className='no-rows'>No logs, possibly loading them...</pre>;
    }
}
