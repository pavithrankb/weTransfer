import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Upload from './pages/Upload';
import Success from './pages/Success';
import Download from './pages/Download';
import Dashboard from './pages/Dashboard';
import About from './pages/About';

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Upload />} />
                    <Route path="/success/:id" element={<Success />} />
                    <Route path="/transfers/:id" element={<Download />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/about" element={<About />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
