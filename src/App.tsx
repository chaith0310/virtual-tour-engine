import PanoramaViewer from "./components/PanoramaViewer";

function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <PanoramaViewer />
    </div>
  );
}

export default App;