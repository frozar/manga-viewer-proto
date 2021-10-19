import React from "react";
import Head from "next/head";
import { useSprings, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import clamp from "lodash.clamp";

const pages = [
  "https://lelscans.net/mangas/one-piece/1028/00.png",
  "https://lelscans.net/mangas/one-piece/1028/01.png",
  "https://lelscans.net/mangas/one-piece/1028/02.png",
  "https://lelscans.net/mangas/one-piece/1028/03.png",
  "https://lelscans.net/mangas/one-piece/1028/04.png",
  "https://lelscans.net/mangas/one-piece/1028/05.png",
  "https://lelscans.net/mangas/one-piece/1028/06.png",
];

const initialIndex = 0;
let currentImageIndex = initialIndex;

const isNextToCurrentImage = (currentIndex, i) => {
  const neighbourhood = 3;
  return currentIndex - neighbourhood <= i && i <= currentIndex + neighbourhood;
};

const computeDarknessValue = (currentIndex, i) => {
  const dist = Math.abs(currentIndex - i);
  let darknessValue = 0;
  if (dist === 0) {
    darknessValue = 0;
  } else {
    darknessValue = 0.7;
  }
  return darknessValue;
};

const computeDarkness = (currentIndex, i) => {
  const darknessValue = computeDarknessValue(currentIndex, i);
  return `rgba(0, 0, 0, ${darknessValue})`;
};

const computeDarknessAnimation = (
  currentIndex,
  i,
  isMxPositive,
  animationPourcentage
) => {
  const darknessValueOrigin = computeDarknessValue(currentIndex, i);
  let darknessValueTarget = 1;
  if (isMxPositive) {
    darknessValueTarget = computeDarknessValue(currentIndex, i + 1);
  } else {
    darknessValueTarget = computeDarknessValue(currentIndex, i - 1);
  }
  const darknessValueEffective =
    (1 - animationPourcentage) * darknessValueOrigin +
    animationPourcentage * darknessValueTarget;
  return `rgba(0, 0, 0, ${darknessValueEffective})`;
};

const computeScaleFactor = (currentIndex, i) => {
  const dist = Math.abs(currentIndex - i);
  let scaleFactor = 1;
  if (dist === 0) {
    scaleFactor = 1;
  } else if (dist === 1) {
    scaleFactor = 0.9;
  } else {
    scaleFactor = 0.8;
  }
  return scaleFactor;
};

const computeScaleAnimation = (
  currentIndex,
  i,
  isMxPositive,
  animationPourcentage
) => {
  const scaleOrigin = computeScaleFactor(currentIndex, i);
  let scaleTarget = 1;
  if (isMxPositive) {
    scaleTarget = computeScaleFactor(currentIndex, i + 1);
  } else {
    scaleTarget = computeScaleFactor(currentIndex, i - 1);
  }
  const scaleEffective =
    (1 - animationPourcentage) * scaleOrigin +
    animationPourcentage * scaleTarget;
  return scaleEffective;
};

const screenConstrainedImageSize = (image, viewport) => {
  const [imageWidth, imageHeight] = [image.width, image.height];
  const { width: viewportWidth, height: viewportHeight } = viewport;

  let scaleFactor = 1;
  scaleFactor = Math.max(scaleFactor, imageHeight / viewportHeight);
  scaleFactor = Math.max(scaleFactor, imageWidth / viewportWidth);
  return [imageWidth / scaleFactor, imageHeight / scaleFactor];
};

const computeXorigin = (index, i, images, viewport) => {
  return computeXoriginAnimation(index, i, images, viewport, true, 0);
};

const computeXoriginAnimation = (
  currentIndex,
  i,
  images,
  viewport,
  isMxPositive,
  animationPourcentage
) => {
  // Compute xOrigin
  let xOrigin = 0;
  const xOriginMargin = 15;
  // This 'imageMargin' variable is directly link to the margin applied
  // to an image:
  // marginLeft: "2px",
  // marginRight: "2px",
  const imageMargin = 4;

  if (i - currentIndex <= -1) {
    const nextXOffsetOrigin = computeXoriginAnimation(
      currentIndex,
      i + 1,
      images,
      viewport,
      isMxPositive,
      animationPourcentage
    );

    const [currentScreenConstrainedWidth] = screenConstrainedImageSize(
      images[pages[i]],
      viewport
    );
    const currentScaleAnimation = computeScaleAnimation(
      currentIndex,
      i,
      isMxPositive,
      animationPourcentage
    );
    const currentScaledWidth =
      currentScreenConstrainedWidth * currentScaleAnimation + imageMargin;
    xOrigin = nextXOffsetOrigin - currentScaledWidth - xOriginMargin;
  } else if (i - currentIndex === 0) {
    const [screenConstrainedWidth] = screenConstrainedImageSize(
      images[pages[i]],
      viewport
    );
    const scaleAnimation = computeScaleAnimation(
      currentIndex,
      i,
      isMxPositive,
      animationPourcentage
    );
    const scaledWidth = screenConstrainedWidth * scaleAnimation + imageMargin;
    xOrigin = (viewport.width - scaledWidth) / 2;
  } else if (1 <= i - currentIndex) {
    const previousXOffsetOrigin = computeXoriginAnimation(
      currentIndex,
      i - 1,
      images,
      viewport,
      isMxPositive,
      animationPourcentage
    );
    const [previousScreenConstrainedWidth] = screenConstrainedImageSize(
      images[pages[i - 1]],
      viewport
    );
    const scaleAnimation = computeScaleAnimation(
      currentIndex,
      i - 1,
      isMxPositive,
      animationPourcentage
    );
    const previousScaledWidth =
      previousScreenConstrainedWidth * scaleAnimation + imageMargin;

    xOrigin = previousXOffsetOrigin + previousScaledWidth + xOriginMargin;
  }

  return xOrigin;
};

function Viewpager(props) {
  const {
    state: { images, viewport, api },
    springProps,
  } = props;

  const bind = useDrag(
    ({
      active,
      movement: [mx],
      direction: [xDir],
      cancel, //, tap
    }) => {
      // Fullscreen toggling
      // if (tap) {
      //   if (!document.fullscreenElement) {
      //     document.documentElement.requestFullscreen();
      //   } else {
      //     document.exitFullscreen();
      //   }
      // }

      // If the move in x direction is above a certain threshold,
      // update image to show
      // console.log("xDir", xDir);
      // console.log("mx", mx);
      const thresholdMx = Math.min(viewport.width / 10, 150);
      if (active && thresholdMx < Math.abs(mx)) {
        const xIncrement = 0 < xDir ? -1 : 1;
        const toClamp = currentImageIndex + xIncrement;
        const lower = 0;
        const upper = pages.length - 1;
        currentImageIndex = clamp(toClamp, lower, upper);
        cancel();
      } else {
        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!isNextToCurrentImage(currentImageIndex, i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            const animationPourcentage = active
              ? Math.abs(mx) / thresholdMx
              : 0;
            const isMxPositive = 0 < mx;

            // Compute xOrigin
            const xOrigin = computeXoriginAnimation(
              currentImageIndex,
              i,
              images,
              viewport,
              isMxPositive,
              animationPourcentage
            );

            // Compute x animation
            const xOffset = active ? mx : 0;
            const x = xOrigin + xOffset;

            // Compute scale animation
            const scaleOrigin = computeScaleAnimation(
              currentImageIndex,
              i,
              true,
              0
            );

            const scaleAnimation = computeScaleAnimation(
              currentImageIndex,
              i,
              isMxPositive,
              animationPourcentage
            );
            const scale = active ? scaleAnimation : scaleOrigin;

            // Compute color animation
            const nbColor = 8;
            const interpolationQuantum = 1 / nbColor;
            const colorIndex = Math.ceil(
              animationPourcentage / interpolationQuantum
            );
            let colorStr = "0";
            if (colorIndex < 10) {
              colorStr = `${colorIndex}`;
            } else {
              colorStr = `A`;
            }
            const interpolateBackgroundColor = active
              ? `#${colorStr}${colorStr}${colorStr}`
              : "#000";

            let [screenConstrainedWidth, screenConstrainedHeight] =
              screenConstrainedImageSize(images[pages[i]], viewport);

            // This 'imageMargin' variable is directly link to the margin applied
            // to an image:
            // marginLeft: "2px",
            // marginRight: "2px",
            const imageMargin = 4;

            const [scaledWidth, scaledHeight] = [
              screenConstrainedWidth,
              screenConstrainedHeight,
            ].map((x) => {
              return x * scale + imageMargin;
            });

            const darknessOrigin = computeDarkness(currentImageIndex, i);
            const darknessAnimation = computeDarknessAnimation(
              currentImageIndex,
              i,
              isMxPositive,
              animationPourcentage
            );
            const darkness = active ? darknessAnimation : darknessOrigin;

            return {
              x,
              scale,
              display: "block",
              backgroundColor: interpolateBackgroundColor,
              scaledWidth,
              scaledHeight,
              darkness,
            };
          }
        });
      }
    }
  );

  // Replace the URL without using the React 'history' object, in a hacky way :
  // https://stackoverflow.com/questions/824349/how-do-i-modify-the-url-without-reloading-the-page
  // The use of the React 'history' object will pass throught the React Router
  // and trigger all the sanity process and make a call to the DB again.
  const handleKeyDown = React.useCallback(
    (evt) => {
      const slideDuration = 300;
      // const slideDuration = 10000;

      const animation = (xIncrement) => {
        // const xIncrement = 1;
        const toClamp = currentImageIndex + xIncrement;
        const lower = 0;
        const upper = pages.length - 1;
        currentImageIndex = clamp(toClamp, lower, upper);

        api.stop();

        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!isNextToCurrentImage(currentImageIndex, i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            // Compute xOrigin
            const xOrigin = computeXorigin(
              currentImageIndex,
              i,
              images,
              viewport
            );

            const scale = computeScaleFactor(currentImageIndex, i);

            let [screenConstrainedWidth, screenConstrainedHeight] =
              screenConstrainedImageSize(images[pages[i]], viewport);

            const [scaledWidth, scaledHeight] = [
              screenConstrainedWidth,
              screenConstrainedHeight,
            ].map((x) => {
              return x * scale + 4;
            });
            const darkness = computeDarkness(currentImageIndex, i);
            return {
              to: {
                x: xOrigin,
                scale,
                display: "block",
                backgroundColor: "#000",
                scaledWidth,
                scaledHeight,
                darkness,
              },
              config: { duration: slideDuration },
            };
          }
        });
      };

      if (evt.key === "ArrowLeft") {
        animation(-1);
      } else if (evt.key === "ArrowRight") {
        animation(1);
      } else if (evt.key === "f") {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    },
    [api, viewport, images]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="wrapper">
      {springProps.map(
        (
          {
            x,
            display,
            scale,
            backgroundColor,
            scaledWidth,
            scaledHeight,
            darkness,
          },
          i
        ) => {
          let [screenConstrainedWidth, screenConstrainedHeight] =
            screenConstrainedImageSize(images[pages[i]], viewport);

          return (
            <animated.div
              className="page"
              {...bind()}
              key={i}
              style={{
                display,
                x,
                backgroundColor,
                zIndex: pages.length - i,
              }}
            >
              <animated.div
                style={{
                  scale,
                  display: "flex",
                  alignItems: "center",
                  // transformOrigin: "bottom center",
                  transformOrigin: "left",
                  width: scaledWidth,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${pages[i]}`}
                  alt="manga"
                  width={screenConstrainedWidth}
                  height={screenConstrainedHeight}
                  style={{
                    position: "relative",
                    marginLeft: "2px",
                    marginRight: "2px",
                  }}
                  onDragStart={(e) => {
                    e.preventDefault();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                  }}
                />
              </animated.div>
              <animated.div
                style={{
                  backgroundColor: darkness,
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  top: 0,
                }}
              />
            </animated.div>
          );
        }
      )}
    </div>
  );
}

export default function App() {
  const [state, setState] = React.useState({
    viewport: { width: 1280, height: 960 },
    images: {},
    ready: false,
    api: null,
  });

  const [touchImages, setTouchImages] = React.useState({ value: false });

  // Initialise the viewport and the images
  React.useEffect(() => {
    let updateViewport = false;
    let viewportWk = { width: 1280, height: 960 };
    if (
      typeof window !== "undefined" &&
      state.viewport.width !== window.innerWidth &&
      state.viewport.height !== window.innerHeight
    ) {
      updateViewport = true;
      viewportWk = { width: window.innerWidth, height: window.innerHeight };
    }

    let updateImages = false;
    const toLoad = {};
    for (const pageURL of pages) {
      if (
        state.images[pageURL] === undefined ||
        state.images[pageURL].src !== pageURL
      ) {
        const img = new Image();
        img.src = pageURL;
        img.loading = "eager";
        img.onload = () => {
          setTouchImages({ ...touchImages, value: !touchImages.value });
        };
        toLoad[pageURL] = img;
        updateImages = true;
      }
    }

    if (updateViewport || updateImages) {
      if (updateViewport && updateImages) {
        setState({
          ...state,
          images: { ...toLoad },
          viewport: viewportWk,
        });
      } else if (updateViewport) {
        setState({
          ...state,
          viewport: viewportWk,
        });
      } else if (updateImages) {
        setState({ ...state, images: { ...toLoad } });
      }
    }
  }, [state, touchImages]);

  // Setup the Spring api
  const [springProps, api] = useSprings(pages.length, (i) => {
    return {
      x: i * state.viewport.width,
      scale: 1,
      display: "block",
      backgroundColor: "#000",
      scaledWidth: 0,
      scaledHeight: 0,
      darkness: "rgba(0, 0, 0, 0)",
    };
  });

  // If every image was setup, is the spring values and the ready flag
  React.useEffect(() => {
    if (
      !state.ready &&
      pages.filter(
        (pageURL) =>
          state.images[pageURL] !== undefined && state.images[pageURL].complete
      ).length === pages.length
    ) {
      api.start((i) => {
        if (!isNextToCurrentImage(initialIndex, i)) {
          const xOrigin = computeXoriginAnimation(
            initialIndex,
            i,
            state.images,
            state.viewport,
            true,
            0
          );
          const darkness = computeDarkness(initialIndex, i);
          return {
            x: xOrigin,
            display: "none",
            backgroundColor: "#000",
            darkness,
          };
        } else {
          const xOrigin = computeXoriginAnimation(
            initialIndex,
            i,
            state.images,
            state.viewport,
            true,
            0
          );
          const scaleFactor = computeScaleFactor(initialIndex, i);

          // This 'imageMargin' variable is directly link to the margin applied
          // to an image:
          // marginLeft: "2px",
          // marginRight: "2px",
          const imageMargin = 4;

          const [screenConstrainedWidth, screenConstrainedHeight] =
            screenConstrainedImageSize(state.images[pages[i]], state.viewport);
          const [scaledWidth, scaledHeight] = [
            screenConstrainedWidth,
            screenConstrainedHeight,
          ].map((x) => x * scaleFactor + imageMargin);
          const darkness = computeDarkness(initialIndex, i);
          return {
            from: {
              x: xOrigin,
              scale: scaleFactor,
              display: "block",
              backgroundColor: "#000",
              scaledWidth,
              scaledHeight,
              darkness,
            },
          };
        }
      });

      setState({
        ...state,
        api: api,
        ready: true,
      });
    }
  }, [api, state, touchImages]);

  // Update the viewport
  const handleResize = React.useCallback(() => {
    if (
      state.viewport.width !== window.innerWidth ||
      state.viewport.height !== window.innerHeight
    ) {
      const viewport = { width: window.innerWidth, height: window.innerHeight };
      setState({
        ...state,
        viewport,
      });

      if (state.api !== null) {
        api.start((i) => {
          if (!isNextToCurrentImage(currentImageIndex, i)) {
            const xOrigin = computeXoriginAnimation(
              currentImageIndex,
              i,
              state.images,
              viewport,
              true,
              0
            );
            const darkness = computeDarkness(currentImageIndex, i);
            return {
              x: xOrigin,
              display: "none",
              backgroundColor: "#000",
              darkness,
            };
          } else {
            const xOrigin = computeXoriginAnimation(
              currentImageIndex,
              i,
              state.images,
              viewport,
              true,
              0
            );
            const scaleFactor = computeScaleFactor(currentImageIndex, i);

            // This 'imageMargin' variable is directly link to the margin applied
            // to an image:
            // marginLeft: "2px",
            // marginRight: "2px",
            const imageMargin = 4;

            let [screenConstrainedWidth, screenConstrainedHeight] =
              screenConstrainedImageSize(state.images[pages[i]], viewport);
            const [scaledWidth, scaledHeight] = [
              screenConstrainedWidth,
              screenConstrainedHeight,
            ].map((x) => x * scaleFactor + imageMargin);
            const darkness = computeDarkness(currentImageIndex, i);
            return {
              to: {
                x: xOrigin,
                scale: scaleFactor,
                display: "block",
                backgroundColor: "#000",
                scaledWidth,
                scaledHeight,
                darkness,
              },
            };
          }
        });
      }
    }
  }, [state, api]);

  // Trigger a viewport update if the size of the window change
  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="./styles.module.css" media="all" />
      </Head>
      <div className="flex fill center">
        {state.ready ? (
          <Viewpager state={state} springProps={springProps} />
        ) : (
          "Wait a moment please."
        )}
      </div>
    </>
  );
}
