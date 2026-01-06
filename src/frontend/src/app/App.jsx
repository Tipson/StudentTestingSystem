import React, {Suspense, lazy} from 'react';
import {BrowserRouter} from 'react-router-dom';
import AppRouter from './AppRouter.jsx';

export default function App() {

    return (
        <BrowserRouter>
            <AppRouter/>
        </BrowserRouter>
    );
}
