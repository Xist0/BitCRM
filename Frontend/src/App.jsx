import React from 'react';
import LeadList from './components/LeadList';
import './App.css';

const App = () => {
    return (
        <div className="app">
            <h1>Leads from Bitrix 24</h1>
            <LeadList />
        </div>
    );
};

export default App;
