"use client"

import dynamic from "next/dynamic"

export const ClientMap = dynamic(
  () => import("../../components/Map").then((mod) => mod.MapComponent),
  {
    ssr: false,
  },
)