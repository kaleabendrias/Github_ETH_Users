import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import DevelopersInterface from "./components/DeveloperInterface";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<DevelopersInterface />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
