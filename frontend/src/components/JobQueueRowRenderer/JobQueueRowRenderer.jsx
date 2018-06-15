import React, { PropTypes } from 'react';
import ReactDataGrid from 'react-data-grid';

const { Row } = ReactDataGrid;

export default class JobQueueRowRenderer extends React.Component {
  static propTypes = {
    idx: PropTypes.number.isRequired
  };

  render() {
    return (<div><Row ref={ node => this.row = node } {...this.props}/></div>);
  }
}
