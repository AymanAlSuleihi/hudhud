import React from "react"
import { Helmet } from "react-helmet-async"
import { MetaTagsData } from "../utils/metaTags"

interface MetaTagsProps {
  data: MetaTagsData
  structuredData?: any
}

export const MetaTags: React.FC<MetaTagsProps> = ({ data, structuredData }) => {
  return (
    <Helmet>
      <title>{data.title}</title>
      <meta name="description" content={data.description} />
      <link rel="canonical" href={data.url} />

      <meta property="og:type" content={data.type} />
      <meta property="og:url" content={data.url} />
      <meta property="og:title" content={data.title} />
      <meta property="og:description" content={data.description} />
      <meta property="og:image" content={data.image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={data.title} />
      <meta name="twitter:description" content={data.description} />
      <meta name="twitter:image" content={data.image} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  )
}

export default MetaTags
