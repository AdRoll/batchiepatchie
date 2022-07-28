import React, { PropTypes } from 'react';
import debounce from 'utils/debounce';
import './SearchBox.scss';

/**
 * A search field with next and previous buttons
 */
export default class SearchBox extends React.Component {
    static propTypes = {
        // The lines of text to search.
        rows: PropTypes.array.isRequired,
        // Callback ith the new searchText and currentSearchRow.
        onSearchChanged: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            // Search text to highlight.
            searchText: '',
            // Index of the row with the current search result, or -1 if not found.
            currentSearchRow: -1,
            // Whether to display the "Not found" message.
            notFound: false,
        };
        this.onSearchTextChangedDebounced = debounce(this.onSearchTextChangedDebounced, 1000);
    }

    render() {
        const { searchText, notFound } = this.state;
        return (
            <div className='search-box'>
                Search:
                <input type='text' value={searchText} onChange={this.onSearchTextChanged} />
                <button onClick={this.onClickPrev}>Prev</button>
                <button onClick={this.onClickNext}>Next</button>
                { notFound && <span className="search-not-found">Not found</span> }
            </div>
        );
    }

    /**
     * Non-debounced text change handler.
     */
    onSearchTextChanged = (event) => {
        this.setState({searchText: event.target.value, notFound: false});
        this.onSearchTextChangedDebounced(event.target.value);
    }

    /**
     * Debounced text change handler.
     */
    onSearchTextChangedDebounced = (searchText) => {
        const { onSearchChanged } = this.props;
        const newSearchRow = searchText === '' ? -1 : this.find(searchText, -1, 1);
        onSearchChanged(searchText, newSearchRow);
        if (newSearchRow === -1) {
            this.setState({notFound: searchText !== ''});
        }
        this.setState({currentSearchRow: newSearchRow});
    }

    /**
     * The Next button was clicked.
     */
    onClickNext = () => {
        const { onSearchChanged } = this.props;
        const { currentSearchRow, searchText } = this.state;
        if (searchText === '') {
            return;
        }
        const newSearchRow = this.find(searchText, currentSearchRow, 1);
        if (newSearchRow === -1) {
            this.setState({notFound: true});
            // Don't set currentSearchRow to -1 if the user tries to go past the last occurrence.
            // Just leave them at the last occurrence.
        } else {
            this.setState({notFound: false, currentSearchRow: newSearchRow});
            onSearchChanged(searchText, newSearchRow);
        }
    }

    /**
     * The Prev button was clicked.
     */
    onClickPrev = () => {
        const { onSearchChanged } = this.props;
        const { currentSearchRow, searchText } = this.state;
        if (searchText === '') {
            return;
        }
        const newSearchRow = this.find(searchText, currentSearchRow, -1);
        if (newSearchRow === -1) {
            this.setState({notFound: true});
            // Don't set currentSearchRow to -1 if the user tries to go past the first occurrence.
            // Just leave them at the first occurrence.
        } else {
            this.setState({notFound: false, currentSearchRow: newSearchRow});
            onSearchChanged(searchText, newSearchRow);
        }
    }

    /**
     * Looks in the rows for the search text and returns the index of the next matching row,
     * or -1 if not found.
     *
     * delta is +1 for Next and -1 for Prev.
     */
    find = (searchText, currentSearchRow, delta) => {
        const { rows } = this.props;
        let i = currentSearchRow;
        i += delta;
        while (0 <= i && i <= rows.length - 1) {
            if (rows[i].toLowerCase().indexOf(searchText.toLowerCase()) > -1) {
                return i;
            }
            i += delta;
        }
        return -1;
    }
}
