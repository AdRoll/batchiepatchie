import React from 'react';
import './SectionLoader.scss';

export default function SectionLoader() {
    return (
        <div className='section-loader'>
            <div className="lds-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
        </div>
    );
}
