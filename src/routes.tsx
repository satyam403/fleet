import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { Inspection } from "./pages/InspectionDOT";
import {Inspectionself} from "./pages/Inspection"
import { WorkOrders } from "./pages/WorkOrders";
import { Inventory } from "./pages/Inventory";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout/>
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      { path: "inspection", Component: Inspection },
      {path:"Inspectionself",Component:Inspectionself},
      { path: "work-orders", Component: WorkOrders },
      { path: "inventory", Component: Inventory },
      { path: "settings", Component: Settings },
      { path: "*", Component: NotFound },
    ],
  },
]);