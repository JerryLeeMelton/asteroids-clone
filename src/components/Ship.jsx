import React, { useState, useEffect } from "react"
import { Line, Arc, Path } from "react-konva"

const Ship = () => {
  const [shipPosition, setShipPosition] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  })
  const [shipRotation, setShipRotation] = useState(0)
  const [velocity, setVelocity] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowLeft":
          setShipRotation((prevRotation) => shipRotation - 5)
          break
        case "ArrowRight":
          setShipRotation((prevRotation) => shipRotation + 5)
          break
        case "ArrowUp":
          const angleInRadians = (shipRotation * Math.PI) / 180
          setVelocity((prevVelocity) => ({
            x: prevVelocity.x + Math.sin(angleInRadians) * 0.5, // Adjust thrust power
            y: prevVelocity.y - Math.cos(angleInRadians) * 0.5,
          }))
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [shipRotation])

  return (
    <>
      {/* Unified ship using a Path element */}
      <Path
        data={`
          M 0 -30  // Move to the tip of the ship
          L 10 15  // Draw line to the right corner
          A 10 10 0 0 0 -10 15  // Arc for the inward curved back, note the '0' flag to curve inward
          Z  // Close the path
        `}
        x={shipPosition.x}
        y={shipPosition.y}
        rotation={shipRotation}
        stroke="white"
        strokeWidth={2}
      />
    </>
  )

  return (
    <>
      {/* Ship body (two long sides of the triangle) */}
      <Line
        points={[-10, 15, 0, -30, 10, 15]} // Points define the two long sides of the ship
        x={shipPosition.x}
        y={shipPosition.y}
        rotation={shipRotation}
        stroke="white"
        strokeWidth={2}
      />

      {/* Inward curved back arc */}
      <Arc
        x={shipPosition.x}
        y={shipPosition.y + 15} // Positioned at the back of the triangle
        innerRadius={10} // Radius adjusted to match the ship's width
        outerRadius={10}
        angle={180} // Semi-circle to cover the back
        rotation={180} // Inward curvature
        stroke="white"
        strokeWidth={2}
      />
    </>
  )
}

export default Ship
