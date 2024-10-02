import logo from "./logo.svg"
import "./App.css"
import { Stage, Layer, Circle } from "react-konva"

function App() {
  return (
    <div className="App">
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Circle
            x={window.innerWidth / 2}
            y={window.innerHeight / 2}
            radius={50}
            fill="red"
            stroke="black"
            shadowBlur={10}
          />
        </Layer>
      </Stage>
    </div>
  )
}

export default App
