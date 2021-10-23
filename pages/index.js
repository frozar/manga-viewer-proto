import React from "react";
import Head from "next/head";
import { useSprings, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import clamp from "lodash.clamp";

import ControlBar from "../components/ControlBar";

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
    isZoomActive,
    setIsZoomActive,
  } = props;

  const isDragging = React.useRef(true);
  const draggingModeSet = React.useRef(false);
  const isTimeThresholdPassed = React.useRef(false);
  const initialTimeStamp = React.useRef(0);
  const xTransformOriginInit = React.useRef(null);
  const yTransformOriginInit = React.useRef(null);
  const zoomElapseTimeThreshold = 200;

  const bind = useDrag(
    ({
      active,
      movement: [mx],
      direction: [xDir],
      cancel,
      timeStamp,
      currentTarget,
      xy: [pointerX, pointerY],
    }) => {
      // Detect if user is dragging or not
      // const pagesURL = currentTarget.children[0].children[0].children[0].src;
      const pagesURL = currentTarget.children[0].children[0].src;
      const indexOfDraggingImage = pages.indexOf(pagesURL);
      if (indexOfDraggingImage !== currentImageIndex) {
        isDragging.current = true;
        draggingModeSet.current = true;
        isTimeThresholdPassed.current = true;

        if (!active) {
          initialTimeStamp.current = 0;
          isDragging.current = true;
          draggingModeSet.current = false;
          isTimeThresholdPassed.current = false;
          setIsZoomActive(false);
        }
      } else {
        if (initialTimeStamp.current === 0) {
          initialTimeStamp.current = timeStamp;
          isDragging.current = true;
          draggingModeSet.current = false;
          isTimeThresholdPassed.current = false;
        } else {
          const elapseTime = timeStamp - initialTimeStamp.current;
          // console.log("elapseTime", elapseTime, "Math.abs(mx)", Math.abs(mx));
          if (
            zoomElapseTimeThreshold < elapseTime &&
            !draggingModeSet.current
          ) {
            isTimeThresholdPassed.current = true;
            if (Math.abs(mx) < 10) {
              isDragging.current = false;
            }
            draggingModeSet.current = true;
          }
        }
        if (!active) {
          initialTimeStamp.current = 0;
          isDragging.current = true;
          draggingModeSet.current = false;
          isTimeThresholdPassed.current = false;
          xTransformOriginInit.current = null;
          yTransformOriginInit.current = null;
          setIsZoomActive(false);
        }
      }

      const isZoomActiveFast =
        active && !isDragging.current && isTimeThresholdPassed.current;
      if (isZoomActive !== isZoomActiveFast) {
        setIsZoomActive(isZoomActiveFast);
      }

      const isDragActive = active && isDragging.current;
      const thresholdMx = Math.min(viewport.width / 5, 150);
      if (isZoomActiveFast) {
        api.start((i) => {
          // If image is not next the to current image, don't display
          // if (!isNextToCurrentImage(currentImageIndex, i)) {
          if (currentImageIndex !== i) {
            const boxShadow = "none";
            return {
              display: "none",
              backgroundColor: "#000",
              boxShadow,
            };
          } else {
            // Compute xOrigin
            const xOrigin = computeXoriginAnimation(
              currentImageIndex,
              i,
              images,
              viewport,
              true,
              0
            );

            // const scale = currentImageIndex === i ? 1.75 : 1;
            // const display = currentImageIndex === i ? "block" : "none";
            const scale = 1.5;
            const display = active ? "block" : "flex";

            // if (currentImageIndex === i) {
            //   // console.log("scale", scale);
            //   console.log("pointerX", pointerX);
            //   console.log("pointerY", pointerY);
            //   // pointerX
            // }
            const [screenConstrainedWidth, screenConstrainedHeight] =
              screenConstrainedImageSize(images[pages[i]], viewport);
            // transform-origin: "left center"
            // const xTransformOrigin = xOrigin;
            // const xTransformOrigin = xOrigin + screenConstrainedWidth / 2;
            const xTransformOrigin = xOrigin;
            // const yTransformOrigin = screenConstrainedHeight / 2;
            // const yTransformOrigin = 0;
            // const yTransformOrigin = screenConstrainedHeight / 2;
            const yTransformOrigin = viewport.height / 2;
            const pointerXTransform = pointerX - xTransformOrigin;
            const pointerYTransform = pointerY - yTransformOrigin;
            if (xTransformOriginInit.current === null) {
              // xTransformOriginInit.current =
              //   (xTransformOrigin - pointerX) * scale;
              // xTransformOriginInit.current = xOrigin;
              // xTransformOriginInit.current = xTransformOrigin * scale; // - pointerX;
              // xTransformOriginInit.current = 0;
              xTransformOriginInit.current =
                xOrigin - pointerXTransform * scale;
              // console.log(
              //   "xTransformOriginInit.current",
              //   xTransformOriginInit.current
              // );
              // console.log("pointerXTransform", pointerXTransform);
              // console.log(
              //   "res",
              //   xTransformOriginInit.current + pointerXTransform
              // );
            }
            if (yTransformOriginInit.current === null) {
              // yTransformOriginInit.current =
              //   (yTransformOrigin - pointerY) * scale;
              // yTransformOriginInit.current = 0;
              const yOffset = (viewport.height - screenConstrainedHeight) / 2;
              yTransformOriginInit.current =
                (yTransformOrigin - pointerY) * scale + yOffset;
              // console.log(
              //   "res",
              //   yTransformOriginInit.current + pointerYTransform
              // );
            }
            return {
              scale,
              display,
              x: xTransformOriginInit.current + pointerXTransform,
              y: yTransformOriginInit.current + pointerYTransform,
            };
          }
        });
      } else if (isDragActive && thresholdMx < Math.abs(mx)) {
        // If the move in x direction is above a certain threshold,
        // update image to show
        const xIncrement = 0 < xDir ? -1 : 1;
        const toClamp = currentImageIndex + xIncrement;
        const lower = 0;
        const upper = pages.length - 1;
        currentImageIndex = clamp(toClamp, lower, upper);
        cancel();
      } else {
        // Animation and end of the animation
        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!isNextToCurrentImage(currentImageIndex, i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            const animationPourcentage = isDragActive
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
            const xOffset = isDragActive ? mx : 0;
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
            const scale = isDragActive ? scaleAnimation : scaleOrigin;

            // Compute color animation
            const nbColor = 4;
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
            const interpolateBackgroundColor = isDragActive
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
            const darkness = isDragActive ? darknessAnimation : darknessOrigin;
            return {
              x,
              y: 0,
              scale,
              // display: "block",
              display: "flex",
              backgroundColor: interpolateBackgroundColor,
              scaledWidth,
              scaledHeight,
              darkness,
              xTransform: 0,
              yTransform: 0,
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
                // display: "block",
                display: "flex",
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
            y,
            display,
            scale,
            backgroundColor,
            scaledWidth,
            scaledHeight,
            darkness,
            xTransform,
            yTransform,
          },
          i
        ) => {
          const [screenConstrainedWidth, screenConstrainedHeight] =
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
                alignItems: "center",
              }}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
            >
              <animated.div
                style={{
                  y,
                  scale,
                  transformOrigin: "left center",
                  width: scaledWidth,
                  height: screenConstrainedHeight,
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
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
                  display,
                  backgroundColor: darkness,
                  width: "100%",
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
      display: "flex",
      backgroundColor: "#000",
      scaledWidth: 0,
      scaledHeight: 0,
      darkness: "rgba(0, 0, 0, 0)",
      y: 0,
      xTransform: 0,
      yTransform: 0,
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
              display: "flex",
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
      // console.log("Hidden address bar");
      // window.scrollTo(0, 1);
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
                display: "flex",
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
    window.addEventListener("orientationchange", handleResize);
    if (
      screen !== undefined &&
      screen.orientation !== undefined &&
      screen.orientation.addEventListener !== undefined
    ) {
      screen.orientation.addEventListener("change", handleResize);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (
        screen !== undefined &&
        screen.orientation !== undefined &&
        screen.orientation.removeEventListener !== undefined
      ) {
        screen.orientation.removeEventListener("change", handleResize);
      }
    };
  }, [handleResize]);

  const iOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const loadingPourcentage = Math.ceil(
    (pages.filter(
      (pageURL) =>
        state.images[pageURL] !== undefined && state.images[pageURL].complete
    ).length /
      pages.length) *
      100
  );

  const [isZoomActive, setIsZoomActive] = React.useState(false);

  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="./styles.module.css" media="all" />
        {/* Documentation link:
            http://www.onlywebpro.com/2015/07/19/optimizing-full-screen-mobile-web-app-for-ios/ 
        */}
        {/* Set the viewport */}
        <meta
          name="viewport"
          content="width = device-width, initial-scale = 1.0, minimum-scale = 1, maximum-scale = 1, user-scalable = no"
        ></meta>
        {/* Set your app name */}
        <meta name="apple-mobile-web-app-title" content="onlyWebPro"></meta>
        {/* Set your app to full screen mode */}
        <meta name="apple-mobile-web-app-capable" content="yes"></meta>
      </Head>
      <div className="flex fill center">
        {state.ready ? (
          <Viewpager
            state={state}
            springProps={springProps}
            isZoomActive={isZoomActive}
            setIsZoomActive={setIsZoomActive}
          />
        ) : (
          `A moment please ${loadingPourcentage}%`
        )}
      </div>
      {state.ready && !iOS && <ControlBar isZoomActive={isZoomActive} />}
    </>
  );
}
