import { Refine } from "@refinedev/core"
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { Footer } from "./components/Footer"
import { dataProvider } from "./providers/DataProvider"

function App() {
  return (
    <>
      <Refine dataProvider={dataProvider}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Outlet />
          </main>
          <Footer />
        </div>
      </Refine>
    </>
  )
}

export default App
