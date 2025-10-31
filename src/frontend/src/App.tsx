import { Refine } from "@refinedev/core"
import { Outlet } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { Footer } from "./components/Footer"
import { dataProvider } from "./providers/DataProvider"
import ScrollToTop from "./components/ScrollToTop"

function App() {
  return (
    <>
      <Refine dataProvider={dataProvider}>
        <Navbar />
        {/* <div className="min-h-screen lg:ml-60"> */}
        <div className="min-h-screen mt-18">
          <main className="p-4">
            <ScrollToTop />
            <Outlet />
          </main>
          <Footer />
        </div>
      </Refine>
    </>
  )
}

export default App
