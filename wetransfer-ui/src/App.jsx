import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Upload from './pages/Upload';
import Success from './pages/Success';
import Download from './pages/Download';
import Dashboard from './pages/Dashboard';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Upload />} />
                    <Route path="/success/:id" element={<Success />} />
                    <Route path="/transfers/:id" element={<Download />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
