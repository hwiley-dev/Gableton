import { appRoutes } from "./routes";
import { RouteRenderer } from "./RouteRenderer";

export function App() {
  return <RouteRenderer route={appRoutes[0]} />;
}
