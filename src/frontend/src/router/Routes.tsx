import { createBrowserRouter } from "react-router-dom"

import App from "../App.tsx"
import Stats from "../views/Stats.tsx"
import Words from "../views/Words.tsx"
import Epigraph from "../views/Epigraph.tsx"
import Epigraphs from "../views/Epigraphs.tsx"
import About from "../views/About.tsx"
import Maps from "../views/Maps.tsx"
import Ask from "../views/Ask.tsx"
import TermsOfService from "../views/TermsOfService.tsx"
import PrivacyPolicy from "../views/PrivacyPolicy.tsx"
import NotFound from "../views/NotFound.tsx"


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
        element: <Stats />,
      },
      {
        path: "/about",
        element: <About />,
      },
      {
        path: "/maps",
        element: <Maps />,
      },
      {
        path: "/terms-of-service",
        element: <TermsOfService />,
      },
      {
        path: "/privacy-policy",
        element: <PrivacyPolicy />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
])