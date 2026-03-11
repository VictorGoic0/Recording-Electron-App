import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary/ErrorBoundary.jsx";
import { MediaProvider } from "./context/MediaContext.jsx";
import { TimelineProvider } from "./context/TimelineContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <MediaProvider>
      <TimelineProvider>
        <App />
      </TimelineProvider>
    </MediaProvider>
  </ErrorBoundary>
);
