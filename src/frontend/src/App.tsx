import { Refine } from "@refinedev/core"
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { Footer } from "./components/Footer"
import { dataProvider } from "./providers/DataProvider"

function App() {
  return (
    <>
      <Refine dataProvider={dataProvider}>
        <Navbar />
        {/* <div className="min-h-screen lg:ml-60"> */}
        <div className="min-h-screen mt-28">
          <main className="p-4">
            <Outlet />
          </main>
          <Footer />
        </div>
      </Refine>
    </>
  )
}

export default App
