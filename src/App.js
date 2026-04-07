import "./App.css"
import AsteroidsGame from "./components/AsteroidsGame"

function App() {
  return (
    <div className="App">
      <AsteroidsGame
        crtOptions={{
          bloomIntensity: 0.8, // 0-1, glow around bright elements
          bloomSpread: 2.2, // blur radius for bloom passes
          scanlineIntensity: 0.3, // 0-1, darkness of scanline gaps
          grilleIntensity: 0.25, // 0-1, visibility of RGB phosphor stripes
          noiseIntensity: 1, // 0-1, analog static speckle
          brightnessBoost: 1.12, // multiplier to compensate for darkening
        }}
      />
    </div>
  )
}

export default App
