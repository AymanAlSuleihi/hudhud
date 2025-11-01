import { createBrowserRouter } from "react-router-dom"

import App from "../App.tsx"
import Home from "../views/Home.tsx"
import Word from "../views/Word.tsx"
import Words from "../views/Words.tsx"
import Epigraph from "../views/Epigraph.tsx"
import Epigraphs from "../views/Epigraphs.tsx"
import About from "../views/About.tsx"
import Map from "../views/Map.tsx"
import Ask from "../views/Ask.tsx"
import TermsOfService from "../views/TermsOfService.tsx"
import PrivacyPolicy from "../views/PrivacyPolicy.tsx"


export const Router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Ask />,
      },
      {
        path: "/word/:urlKey",
        element: <Word />,
      },
      {
        path: "/words",
        element: <Words />,
      },
      {
        path: "/epigraphs",
        element: <Epigraphs />,
      },
      {
        path: "/epigraphs/:urlKey",
        element: <Epigraph />,
      },
      {
        path: "/stats",
        element: <Home />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/maps",
        element: <Map />,
      },
      {
        path: "/terms-of-service",
        element: <TermsOfService />,
      },
      {
        path: "/privacy-policy",
        element: <PrivacyPolicy />,
      },
    ],
  },
])