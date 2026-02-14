import React from 'react';
import Sidebar from './Sidebar.jsx';
import './Layout.css';

export default function Layout({children}) {
    return (
        <div className="layout">
            <Sidebar/>
            <main className="layout__content">
                {children}
            </main>
        </div>
    );
}
