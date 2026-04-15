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
import CoursesManagement from "../../page/Admin/Courses";
import CourseDetailManagement from "../../page/Admin/CourseDetail";
import ProtectedRoute from "../ProtectedRoute";
import Unauthorized from "../../page/Unauthorized";
import Category from "../../page/Category";
import QuizEditor from "../../page/QuizEditor";
import QuizManagement from "../../page/QuizManagement";
import EnrollmentManagement from "../../page/Enrollments";
import RoleManagement from "../../page/Roles";
import UserManagement from "../../page/Users";
import MyCourses from "../../page/My-courses";
import Courses from "../../page/My-courses";
import CourseDetail from "../../page/CourseDetail";

function AppRoutes() {
  const { token, user } = useContext(AuthContext);

  const getDefaultRoute = () => {
    const roles = user?.roles?.map((r) => r.name) || [];
    if (roles.includes("ADMIN")) return "/admin/courses";
    if (roles.includes("INSTRUCTOR")) return "/admin/courses";
    return "/home";
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Navigate to={getDefaultRoute()} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/login"
          element={
            token ? <Navigate to={getDefaultRoute()} replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            token ? <Navigate to={getDefaultRoute()} replace /> : <Register />
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "INSTRUCTOR", "ADMIN"]} />
          }
        >
          <Route element={<DefaultLayout />}>
            <Route element={<MainContent />}>
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/my-courses" element={<MyCourses />} />
            </Route>
          </Route>
        </Route>

        <Route
          element={<ProtectedRoute allowedRoles={["ADMIN", "INSTRUCTOR"]} />}
        >
          <Route element={<DefaultLayout />}>
            <Route element={<MainContent />}>
              <Route path="/admin/courses" element={<CoursesManagement />} />
              <Route path="/admin/categories" element={<Category />} />
              <Route
                path="/admin/courses/:id"
                element={<CourseDetailManagement />}
              />
              <Route path="/admin/quizzes" element={<QuizManagement />} />
              <Route path="/admin/quizzes/new" element={<QuizEditor />} />
              <Route
                path="/admin/enrollments"
                element={<EnrollmentManagement />}
              />
              <Route
                path="/admin/quizzes/:quizId/edit"
                element={<QuizEditor />}
              />
              <Route path="/admin/roles" element={<RoleManagement />} />
              <Route path="/admin/users" element={<UserManagement />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
