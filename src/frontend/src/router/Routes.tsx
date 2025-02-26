import { createBrowserRouter } from "react-router-dom"

import App from "../App.tsx"
import Home from "../views/Home.tsx"
import Word from "../views/Word.tsx"

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
    ],
  },
])