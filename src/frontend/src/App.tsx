import { Refine } from "@refinedev/core"
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/Navbar"

function App() {
  return (
    <>
      <Refine>
        <Navbar />
        <Outlet />
      </Refine>
    </>
  )
}

export default App
