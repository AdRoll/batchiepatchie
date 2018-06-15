import React, { PropTypes } from 'react';
import ReactDataGrid from 'react-data-grid';
import NameFormatter from 'components/NameFormatter/NameFormatter';
import ActivationFormatter from 'components/ActivationFormatter/ActivationFormatter';
import JobQueueRowRenderer from 'components/JobQueueRowRenderer/JobQueueRowRenderer';
import { JOB_QUEUES_ALL, JOB_QUEUES_ACTIVATED } from 'stores/status';
import { connect } from 'react-redux';
import {
    fetchJobQueues,
    fetchAllJobQueues,
    activateJobQueue,
    deactivateJobQueue
} from 'stores/jobqueue';
import './JobQueuesPage.scss';

const AUTO_REFRESH_TIMEOUT = 5000; // ms

const COLUMNS = [
    {
        key: 'name',
        name: 'Name',
        resizable: false,
        sortable: false,
        width: '100%',
        formatter: NameFormatter
    },
    {
        key: 'activation',
        name: 'Activation',
        resizable: false,
        sortable: false,
        width: 100,
        formatter: ActivationFormatter
    }
];

class JobQueuesPage extends React.Component {
    componentDidMount() {
        this.fetchAll();
    }

    fetchAll() {
        this.props.fetchJobQueues();
        this.props.fetchAllJobQueues();
    }

    setJobQueue(activation, job_queue) {
        switch(activation)
        {
            case 'ACTIVATE':
                this.props.activateJobQueue(job_queue).then(() => this.fetchAll()).catch(() => {});
            break;
            case 'DEACTIVATE':
                this.props.deactivateJobQueue(job_queue).then(() => this.fetchAll()).catch(() => {});
            break;
        }
    }

    render() {
        const status_all = this.props.status_all_job_queues;
        const status_activated = this.props.status_activated_job_queues;

        if ( (!status_all.loading && status_all.error) ||
             (!status_activated.loading && status_activated.error) ) {
            return (
                <div className='jobs-page'>
                    <div className='alert alert-danger'>
                        Could not load API responses for job queues.
                    </div>
                </div>
            );
        }

        let queues_activated = [];
        for ( let key in this.props.activatedJobQueues ) {
            const queue = this.props.activatedJobQueues[key];
            queues_activated.push(queue);
        }

        let queues_all = [];
        for ( let key in this.props.allJobQueues ) {
            const queue = this.props.allJobQueues[key];

            // TODO: this is quadratic check for if queue is already in activated list
            // With some small effort, we could it make it faster.
            let ok_to_add = true;
            for ( let key2 in queues_activated ) {
                if ( queue === queues_activated[key2] ) {
                    ok_to_add = false;
                    break;
                }
            }
            if ( ok_to_add ) {
                queues_all.push(queue);
            }
        }

        queues_all.sort();
        queues_activated.sort();

        const make_row_getter = (lst, act) => (i) => {
            if ( i < lst.length ) {
                return { name: lst[i], activation: { action: act, onClick: () => { this.setJobQueue(act, lst[i]); } } };
            } else {
                return { name: '', activation: { action: '', onClick: () => {} } };
            }
        };

        const row_getter_all = make_row_getter(queues_all, 'ACTIVATE');
        const row_getter_activated = make_row_getter(queues_activated, 'DEACTIVATE');

        const height = 35+35*Math.max(queues_all.length, queues_activated.length);

        return (
            <div className='job-queues-page'>
              <div className='container-fluid job-queues-listings'>
              <div className='row'>
                  <div className='col-md-6'>
                  <h2>Batchiepatchie registered job queues</h2>
                  <div className='job-queues-grid'>
                  <ReactDataGrid
                    columns={ COLUMNS }
                    minHeight={ height }
                    rowsCount= { Math.max(queues_all.length, queues_activated.length) }
                    rowGetter= { row_getter_activated }
                    rowKey='name'
                    rowRenderer={JobQueueRowRenderer}
                  />
                  </div>
                  </div>
                  <div className='col-md-6'>
                  <h2>All job queues</h2>
                  <div className='job-queues-grid'>
                  <ReactDataGrid
                    columns={ COLUMNS }
                    minHeight={ height }
                    rowsCount= { Math.max(queues_all.length, queues_activated.length) }
                    rowGetter= { row_getter_all }
                    rowKey='name'
                    rowRenderer={JobQueueRowRenderer}
                  />
                  </div>
                  </div>
              </div>
              </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    allJobQueues: state.jobqueue.allJobQueues,
    activatedJobQueues: state.jobqueue.activatedJobQueues,
    status_all_job_queues: state.status[JOB_QUEUES_ALL],
    status_activated_job_queues: state.status[JOB_QUEUES_ACTIVATED]
});

const actions = {
    fetchAllJobQueues,
    fetchJobQueues,
    activateJobQueue,
    deactivateJobQueue
};

export default connect(mapStateToProps, actions)(JobQueuesPage);
