import React, { PropTypes } from 'react';
import { connect } from 'react-redux';
import Menu from 'components/Menu/Menu';
import Search from 'components/Search/Search';
import { setPageDimensions } from 'stores/layout';
import './LayoutContainer.scss';

class LayoutContainer extends React.Component {
    static propTypes = {
        children: PropTypes.element.isRequired,
        path: PropTypes.string.isRequired,
        setPageDimensions: PropTypes.func.isRequired
    };

    componentDidMount() {
        this.onResize();
        window.addEventListener('resize', this.onResize);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.onResize);
    }

    render() {
        const onJobsPage = this.props.path === process.env.BASE_URL + '/';
        return (
            <div className='layout-container container-fluid'>
                <div className='row'>
                    <div className='col-md-6'>
                        <h1>Batchiepatchie</h1>
                    </div>
                    <div className='col-md-6'>
                        {onJobsPage && <Search />}
                    </div>
                </div>

                <div className='row'>
                    <div className='col-md-12'>
                        <Menu />
                    </div>
                </div>

                <div className='row'>
                    <div className='col-md-12'>
                        { this.props.children }
                    </div>
                </div>
            </div>
        );
    }

    onResize = () => {
        this.props.setPageDimensions({ height: window.innerHeight, width: window.innerWidth });
    }
}

const mapStateToProps = state => ({
    path: state.routing.locationBeforeTransitions.pathname
});

const actions = {
    setPageDimensions
};

export default connect(mapStateToProps, actions)(LayoutContainer);
