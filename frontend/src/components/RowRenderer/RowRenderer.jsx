import React, { PropTypes } from 'react';
import ReactDataGrid from 'react-data-grid';

const { Row } = ReactDataGrid;

export default class RowRenderer extends React.Component {
  static propTypes = {
    idx: PropTypes.number.isRequired
  };

  setScrollLeft = (scrollBy) => {
    this.row.setScrollLeft(scrollBy);
  };

  getRowStyle = () => {
    return {
      color: this.props.row.termination_requested ? "#FF0000" : "#000000"
    };
  };

  render() {
    return (<div style={ this.getRowStyle() }><Row ref={ node => this.row = node } {...this.props}/></div>);
  }
}
