import { Composition } from "remotion";
import { AppPresentation } from "./AppPresentation";

export const RemotionRoot = () => {
  return (
    <Composition
      id="ArchiDeskPresentation"
      component={AppPresentation}
      durationInFrames={1080}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
