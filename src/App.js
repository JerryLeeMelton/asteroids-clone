import logo from "./logo.svg"
import "./App.css"
import { Stage, Layer, Circle } from "react-konva"
import Ship from "./components/Ship"

function App() {
  return (
    <div className="App">
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Ship />
        </Layer>
      </Stage>
    </div>
  )
}

export default App
