import React, { PropTypes } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import classNames from 'classnames';
import './Menu.scss';

const pages = [
    {
        name: 'Jobs',
        path: '/'
    },
    {
        name: 'Job queues',
        path: '/job_queues'
    },
];

function Menu({ path }) {
    return (
        <div className='menu'>
            <ul className='nav nav-tabs'>
                { pages.map(page => (
                    <li
                        key={ page.path }
                        className={ classNames({active: path === page.path}) }
                    >
                        <Link to={ page.path }>{ page.name }</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

Menu.propTypes = {
    path: PropTypes.string.isRequired
};

const mapStateToProps = state => ({
    path: state.routing.locationBeforeTransitions.pathname,
});

const actions = {};

export default connect(mapStateToProps, actions)(Menu);
