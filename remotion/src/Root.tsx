import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { VasaShort, VASA_FRAMES } from "./videos/vasa/Vasa";

export const Root: React.FC = () => (
  <>
    <Composition id="VasaShort" component={VasaShort} durationInFrames={VASA_FRAMES} fps={30} width={1080} height={1920} />
    {/* final 2K export: native 1440x2560 (Remotion needs integer output sizes, so --scale 1.3333 on 1080x1920 is refused) */}
    <Composition id="VasaShort2K" component={VasaShort} durationInFrames={VASA_FRAMES} fps={30} width={1440} height={2560} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
