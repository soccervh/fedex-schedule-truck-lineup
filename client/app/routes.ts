import { type RouteConfig, route, index, layout } from "@react-router/dev/routes";

export default [
  route("login", "./pages/Login.tsx"),
  layout("./layouts/protected.tsx", [
    index("./pages/HomePage.tsx"),
    route("facility", "./pages/FacilityPage.tsx"),
    route("truck-lineup", "./pages/TruckLineupPage.tsx"),
    route("routes", "./pages/Routes.tsx"),
    route("people", "./pages/People.tsx"),
    route("timeoff", "./pages/TimeOff.tsx"),
    route("my-schedule", "./pages/MySchedule.tsx"),
  ]),
] satisfies RouteConfig;
