
import { useState, useEffect, memo } from "react";
import type { ReactNode } from "react";
import { ReactComponent as OnyxiaLogoSvg } from "app/assets/svg/OnyxiaLogo.svg";
import { createUseClassNames } from "app/theme/useClassNames";
import { css, cx, keyframes } from "tss-react";
import { useDomRect } from "powerhooks";
import Color from "color";
import { createUseGlobalState } from "powerhooks";
import { useRerenderOnStateChange } from "evt/hooks";

export type Props = {
    className?: string;
};

let fadeOutDuration = 700;

export function setSplashScreenFadeOutDuration(value: number) {
    fadeOutDuration = value;
}

export const { useSplashScreen, hideSplashScreen, showSplashScreen } = (() => {

    const { evtDisplayState } = createUseGlobalState(
        "displayState",
        { "count": 1, "isTransparencyEnabled": false, "prevTime": 0 },
        { "persistance": false }
    );

    const { hideSplashScreen } = (() => {

        const { getDoUseDelay } = (() => {

            const { evtLastDelayedTime } = createUseGlobalState(
                "lastDelayedTime",
                0,
                { "persistance": "localStorage" }
            );


            function getDoUseDelay() {

                const doUseDelay = Date.now() - evtLastDelayedTime.state > 30000;

                if (doUseDelay) {
                    evtLastDelayedTime.state = Date.now();
                }

                return doUseDelay;

            }

            return { getDoUseDelay };


        })();

        async function hideSplashScreen() {

            if (getDoUseDelay()) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            evtDisplayState.state = {
                ...evtDisplayState.state,
                "count": Math.max(evtDisplayState.state.count - 1, 0),
                "prevTime": Date.now()
            };

        }

        return { hideSplashScreen };


    })();

    function showSplashScreen(params: { enableTransparency: boolean; }) {
        evtDisplayState.state = {
            "count": evtDisplayState.state.count + 1,
            "isTransparencyEnabled": params.enableTransparency,
            "prevTime": Date.now()
        }
    }

    const { useSplashScreen } = (() => {

        function useOnSplashScreenHidden(
            params: {
                onHidden: (() => void) | undefined;
                isSplashScreenShown: boolean;
                prevTime: number;
            }
        ) {

            const { onHidden, isSplashScreenShown, prevTime } = params;

            useEffect(
                () => {

                    if (isSplashScreenShown || onHidden === undefined) {
                        return;
                    }

                    const delayLeft = [fadeOutDuration - (Date.now() - prevTime)]
                        .filter(v => v > 0)[0] ?? 0;

                    let timer: ReturnType<typeof setTimeout>;

                    (async () => {

                        await new Promise(resolve => timer = setTimeout(
                            resolve, delayLeft
                        ));

                        onHidden();

                    })();

                    return () => clearTimeout(timer);

                },
                // eslint-disable-next-line react-hooks/exhaustive-deps
                [isSplashScreenShown]
            );

        }

        function useSplashScreen(
            params?: { onHidden?(): void }
        ) {

            const { onHidden } = params ?? {};

            useRerenderOnStateChange(evtDisplayState);

            const isSplashScreenShown = evtDisplayState.state.count > 0;

            useOnSplashScreenHidden({
                onHidden,
                isSplashScreenShown,
                "prevTime": evtDisplayState.state.prevTime
            });

            return {
                isSplashScreenShown,
                "isTransparencyEnabled": evtDisplayState.state.isTransparencyEnabled
            };

        }

        return { useSplashScreen };


    })();

    return { useSplashScreen, hideSplashScreen, showSplashScreen };

})();



const fadeInAndOut = keyframes`
60%, 100% {
    opacity: 0;
}
0% {
    opacity: 0;
}
40% {
    opacity: 1;
}
`;

const { useClassNames } = createUseClassNames<{
    isVisible: boolean;
    isFadingOut: boolean;
    isTransparencyEnabled: boolean;
}>()(
    (theme, { isVisible, isFadingOut, isTransparencyEnabled }) => ({
        "root": {
            "backgroundColor": (() => {

                const color = new Color(theme.custom.colors.useCases.surfaces.background).rgb();

                return color
                    .alpha(isTransparencyEnabled ? 0.6 : (color as any).valpha)
                    .string();

            })(),
            "backdropFilter": isTransparencyEnabled ? "blur(10px)" : undefined,
            "display": "flex",
            "alignItems": "center",
            "justifyContent": "center",
            "visibility": isVisible ? "visible" : "hidden",
            "opacity": isFadingOut ? 0 : 1,
            "transition": `opacity ease-in-out ${fadeOutDuration}ms`,
            "& g": {
                "opacity": 0,
                "animation": `${fadeInAndOut} 3.5s infinite ease-in-out`,
                "&:nth-child(1)": {
                    "animationDelay": ".4s"
                },
                "&:nth-child(2)": {
                    "animationDelay": ".8s"
                },
                "&:nth-child(3)": {
                    "animationDelay": "1.2s"
                }
            }
        },
        "svg": {
            "fill": theme.custom.colors.palette.exuberantOrange.main,
            "height": "20%"
        }

    })
);

const SplashScreen = memo((props: Props) => {

    const { className } = props;

    const { isSplashScreenShown, isTransparencyEnabled } = useSplashScreen();

    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    const { classNames } = useClassNames({
        isVisible,
        isFadingOut,
        isTransparencyEnabled
    });

    useEffect(
        () => {

            let timer = setTimeout(() => { }, 0);

            (async () => {

                if (isSplashScreenShown) {

                    setIsFadingOut(false);
                    setIsVisible(true);

                } else {


                    setIsFadingOut(true);

                    await new Promise(resolve => timer = setTimeout(resolve, fadeOutDuration));

                    setIsFadingOut(false);
                    setIsVisible(false);

                }

            })();

            return () => clearTimeout(timer);

        },
        [isSplashScreenShown]
    );

    return (
        <div className={cx(classNames.root, className)}>
            <OnyxiaLogoSvg
                className={classNames.svg}
            />
        </div>
    );

});

export function SplashScreenProvider(
    params: {
        children: ReactNode;
    }
) {
    const { children } = params;

    const { ref, domRect: { width, height } } = useDomRect();

    return (
        <div ref={ref} className={css({ "height": "100%" })}>
            <SplashScreen className={css({ width, "position": "absolute", height, "zIndex": 10 })} />
            {children}
        </div>
    );

}
