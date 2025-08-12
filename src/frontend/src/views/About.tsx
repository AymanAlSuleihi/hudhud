import React from "react"
import { MetaTags } from "../components/MetaTags"

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <MetaTags data={{
        title: "About Hudhud - Ancient South Arabian Inscriptions Platform",
        description: "Learn about Hudhud, a modern digital platform for exploring pre-Islamic Arabian inscriptions. Discover the mission behind making ancient epigraphic heritage accessible to researchers worldwide.",
        url: `${import.meta.env.VITE_BASE_URL}/about`,
        image: `${import.meta.env.VITE_BASE_URL}/hudhud_logo.png`,
        type: "website"
      }} />
      <h1 className="text-3xl font-bold mb-6">About Hudhud</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Project Overview</h2>
        <p className="mb-3">
          Hudhud is a modern digital platform for exploring pre-Islamic Arabian inscriptions. 
          Our goal is to make these valuable historical artifacts accessible to researchers, 
          students, and anyone interested in ancient Arabian cultures and languages.
        </p>
        <p className="mb-3">
          The name "Hudhud" (هدهد) refers to the hoopoe, a bird which plays a significant role
          in Arabian folklore and appears in the Qur'an as a messenger between King Solomon
          and the Queen of Sheba. Like this legendary bird that carried messages across vast
          distances, our platform serves as a bridge connecting modern researchers with ancient
          inscriptions, facilitating the transmission of knowledge across time and geography.
          The hoopoe's reputation for wisdom and its ability to discover hidden treasures also
          symbolises our mission to uncover and share the rich epigraphic heritage of pre-Islamic Arabia.
        </p>
        <p>
          The application provides search capabilities across multiple dimensions including 
          period, language, geographical location, and content, allowing users to discover 
          connections between artifacts and gain deeper insights into pre-Islamic Arabian history.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Data Sources</h2>
        <p className="mb-4">
          The epigraphic data in Hudhud is provided by the Digital Archive for the Study of 
          pre-Islamic Arabian Inscriptions (DASI), a comprehensive resource developed by the 
          University of Pisa and CNR (Italian National Research Council).
        </p>
        <div className="bg-gray-100 p-4 rounded-md border border-gray-300">
          <h3 className="font-medium mb-2">Citation Information</h3>
          <p className="mb-2">
            Please cite DASI data as follows:
          </p>
          <p className="italic mb-2">
            DASI - Digital Archive for the Study of pre-Islamic Arabian 
            Inscriptions. <a href="https://dasi.cnr.it/" className="hover:text-gray-500 text-gray-700 transition-colors font-semibold">https://dasi.cnr.it/</a>
          </p>
          <p className="text-sm">
            All epigraphic content is licensed under 
            <a href="https://creativecommons.org/licenses/by/4.0/" className="hover:text-gray-500 text-gray-700 transition-colors font-semibold mx-1">
              Creative Commons Attribution 4.0 International License (CC BY 4.0)
            </a>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Features</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">Advanced Search:</span> Search within inscription translations,
            notes, biblography, and more.
          </li>
          <li>
            <span className="font-medium">Timeline View:</span> Visualise the chronological 
            distribution of inscriptions.
          </li>
          <li>
            <span className="font-medium">Geographic Mapping:</span> Explore artifacts in their 
            geographical context.
          </li>
          <li>
            <span className="font-medium">Detailed Records:</span> Access comprehensive 
            information about each inscription including translations, cultural notes, and bibliographic references.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Contact</h2>
        <p>
          For questions, feedback, or collaboration opportunities, please contact me at{" "}
          <a href="mailto:contact@shebascaravan.com" className="hover:text-gray-500 text-gray-700 transition-colors font-semibold">
            contact@shebascaravan.com
          </a>
        </p>
      </section>
    </div>
  )
}

export default About