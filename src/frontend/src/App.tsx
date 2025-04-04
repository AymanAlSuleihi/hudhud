import { Refine } from "@refinedev/core"
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { dataProvider } from "./providers/DataProvider"

function App() {
  return (
    <>
      <Refine dataProvider={dataProvider}>
        <Navbar />
        <Outlet />
      </Refine>
    </>
  )
}

export default App
