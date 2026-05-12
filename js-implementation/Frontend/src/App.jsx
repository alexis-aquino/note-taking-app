import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path='/SignUp' element={<SignUp />} />
                <Route path='/Home' element={<Home />} />
            </Routes>
        </Router>
    );
}