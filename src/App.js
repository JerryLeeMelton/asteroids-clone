import "./App.css"
import AsteroidsGame from "./components/AsteroidsGame"

function App() {
  return (
    <div className="App">
      <AsteroidsGame
        crtOptions={{
          bloomIntensity: 1, // 0-1, glow around bright elements
          bloomSpread: 3, // blur radius for bloom passes
          scanlineIntensity: 0.28, // 0-1, darkness of scanline gaps
          grilleIntensity: 0.15, // 0-1, visibility of RGB phosphor stripes
          noiseIntensity: 0.03, // 0-1, analog static speckle
          brightnessBoost: 1.2, // multiplier to compensate for darkening
        }}
      />
    </div>
  )
}

export default App
