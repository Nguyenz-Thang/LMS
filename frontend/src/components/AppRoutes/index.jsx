import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import { useContext } from "react";

import Home from "../../page/Home";
import Register from "../../page/Register";
import Login from "../../page/Login";
import MainContent from "../../page/MainContent";
import DefaultLayout from "../../layouts/DefaultLayout";
import { AuthContext } from "../../context/AuthContext";
import NotFound from "../../page/NotFound";
import Profile from "../../page/Profile";
import Courses from "../../page/Courses";
import CourseDetail from "../../page/CourseDetail";

function AppRoutes() {
  const { token } = useContext(AuthContext);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Navigate to="/home" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={token ? <DefaultLayout /> : <Navigate to="/login" replace />}
        >
          <Route element={<MainContent />}>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/courses" element={<Courses />} />

            <Route path="/admin/lessons/:id" element={<CourseDetail />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
