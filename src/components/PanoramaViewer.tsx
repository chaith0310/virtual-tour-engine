import { useEffect, useRef } from "react";
import {
  EquirectangularAdapter,
  Viewer,
} from "@photo-sphere-viewer/core";

import "@photo-sphere-viewer/core/index.css";

import hallCenter from "../assets/panoramas/hall-center.jpg";

export default function PanoramaViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    console.log("Creating panorama viewer");
    console.log("Panorama URL:", hallCenter);

    const viewer = new Viewer({
      container: containerRef.current,

      panorama: hallCenter,

      adapter: EquirectangularAdapter.withConfig({
        useXmpData: false,
      }),

      navbar: ["zoom", "move", "fullscreen"],

      defaultYaw: 0,
      defaultPitch: 0,
      defaultZoomLvl: 35,

      touchmoveTwoFingers: false,
      mousewheelCtrlKey: false,
    });

    return () => {
      console.log("Destroying panorama viewer");
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#111827",
      }}
    />
  );
}