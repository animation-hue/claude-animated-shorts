import React from "react";
import { Composition } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { VasaShort, VASA_FRAMES } from "./videos/vasa/Vasa";
import { RikshawShort, RIKSHAW_FRAMES } from "./videos/rikshaw/Rikshaw";
import { InjectionShort, INJECTION_FRAMES } from "./videos/injection/Injection";
import { FriendsShort, FRIENDS_FRAMES } from "./videos/friends/Friends";
import { KarelaFilm, KARELA_FRAMES } from "./videos/karela/Karela";

export const Root: React.FC = () => (
  <>
    <Composition id="VasaShort" component={VasaShort} durationInFrames={VASA_FRAMES} fps={30} width={1080} height={1920} />
    {/* final 2K export: native 1440x2560 (Remotion needs integer output sizes, so --scale 1.3333 on 1080x1920 is refused) */}
    <Composition id="VasaShort2K" component={VasaShort} durationInFrames={VASA_FRAMES} fps={30} width={1440} height={2560} />
    <Composition id="RikshawShort" component={RikshawShort} durationInFrames={RIKSHAW_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="RikshawShort2K" component={RikshawShort} durationInFrames={RIKSHAW_FRAMES} fps={30} width={1440} height={2560} />
    <Composition id="InjectionShort" component={InjectionShort} durationInFrames={INJECTION_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="InjectionShort2K" component={InjectionShort} durationInFrames={INJECTION_FRAMES} fps={30} width={1440} height={2560} />
    <Composition id="FriendsShort" component={FriendsShort} durationInFrames={FRIENDS_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="FriendsShort2K" component={FriendsShort} durationInFrames={FRIENDS_FRAMES} fps={30} width={1440} height={2560} />
    <Composition id="KarelaFilm" component={KarelaFilm} durationInFrames={KARELA_FRAMES} fps={24} width={1920} height={1080} />
    <Composition id="KarelaFilm2K" component={KarelaFilm} durationInFrames={KARELA_FRAMES} fps={24} width={2560} height={1440} />
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
