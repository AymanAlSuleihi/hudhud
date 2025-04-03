import { createBrowserRouter } from "react-router-dom"

import App from "../App.tsx"
import Home from "../views/Home.tsx"
import Word from "../views/Word.tsx"
import Epigraphs from "../views/Epigraphs.tsx"

export const Router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/word/:urlKey",
        element: <Word />,
      },
      {
        path: "/epigraphs",
        element: <Epigraphs />,
      },
    ],
  },
])