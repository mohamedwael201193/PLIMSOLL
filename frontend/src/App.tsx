import { Navigate, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Desk } from "./pages/Desk";
import { Docs } from "./pages/Docs";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/desk" element={<Desk />} />
      <Route path="/docs" element={<Docs />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
