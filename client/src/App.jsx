import { BrowserRouter, Routes, Route } from "react-router-dom";

// Feature-based imports
import LandingPage from "./features/dashboard/LandingPage";
import Login from "./features/auth/Login";
import ForgotPassword from "./features/auth/ForgotPassword";
import AdminDashboard from "./features/dashboard/AdminDashboard";
import TechnicianDashboard from "./features/dashboard/TechnicianDashboard";
import StaffDashboard from "./features/dashboard/StaffDashboard";
import FacilityHeatmap from "./features/dashboard/FacilityHeatmap";
import Commissioning from "./features/commissioning/Commissioning";
import ThresholdConfig from "./features/sensors/ThresholdConfig";
import UserManagement from "./features/users/UserManagement";
import RoomManagement from "./features/sensors/RoomManagement";
import SensorManagement from "./features/sensors/SensorManagement";
import HistoricalData from "./features/sensors/HistoricalData";
import LoadingDemo from "./features/dashboard/LoadingDemo";
import BulkExport from "./features/reports/BulkExport";
import PrintReport from "./features/reports/PrintReport";
import ProfileSettings from "./features/users/ProfileSettings";
import SystemHealth from "./features/settings/SystemHealth";
import AuditLog from "./features/reports/AuditLog";
import MaintenanceLogs from "./features/reports/MaintenanceLogs";
import NotificationSettings from "./features/settings/NotificationSettings";
import { ProtectedRoute } from "./shared/components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/loading-demo" element={<LoadingDemo />} />

        {/* Admin Routes (Governance & Personnel) */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/rooms"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <RoomManagement sidebarRole="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/thresholds"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ThresholdConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/sensors"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <SensorManagement sidebarRole="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/history"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <HistoricalData sidebarRole="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/bulk-export"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <BulkExport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/print-report"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <PrintReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/system-health"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <SystemHealth sidebarRole="admin" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/profile"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/notifications"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <NotificationSettings />
            </ProtectedRoute>
          }
        />

        {/* Technician Routes (Technical Infrastructure) */}
        <Route
          path="/dashboard/technician"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <TechnicianDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/thresholds"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <ThresholdConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/rooms"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <RoomManagement sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/sensors"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <SensorManagement sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/maintenance"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <MaintenanceLogs sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/system-health"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <SystemHealth sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/history"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <HistoricalData sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/heatmap"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <FacilityHeatmap sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/bulk-export"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <BulkExport sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/print-report"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <PrintReport sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/profile"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <ProfileSettings sidebarRole="technician" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/technician/notifications"
          element={
            <ProtectedRoute allowedRoles={["TECHNICIAN"]}>
              <NotificationSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/commissioning"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "TECHNICIAN"]}>
              <Commissioning />
            </ProtectedRoute>
          }
        />

        {/* Staff Routes (Clinical Operations) */}
        <Route
          path="/dashboard/staff"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/staff/heatmap"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <FacilityHeatmap sidebarRole="staff" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/staff/report"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <PrintReport sidebarRole="staff" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/staff/profile"
          element={
            <ProtectedRoute allowedRoles={["STAFF"]}>
              <ProfileSettings sidebarRole="staff" />
            </ProtectedRoute>
          }
        />

        {/* Shared/Legacy */}
        <Route
          path="/dashboard/reports/maintenance"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "TECHNICIAN"]}>
              <MaintenanceLogs />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
