import React, { useRef } from "react";
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

// const images = {};
// const landscape = 0;
// const portrait = 1;

const initialIndex = 3;

const isNextToCurrentImage = (currentIndex, i) => {
  const neighbourhood = 2;
  return currentIndex - neighbourhood <= i && i <= currentIndex + neighbourhood;
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

const adjustedImageSize = (image, viewport, currentIndex, i) => {
  const [imageWidth, imageHeight] = [image.width, image.height];
  const { width: viewportWidth, height: viewportHeight } = viewport;

  let scaleFactor = 1;
  scaleFactor = Math.max(scaleFactor, imageHeight / viewportHeight);
  scaleFactor = Math.max(scaleFactor, imageWidth / viewportWidth);
  return [imageWidth / scaleFactor, imageHeight / scaleFactor];
  // .map(
  //   (x) => x * computeScaleFactor(currentIndex, i)
  // );
};

const computeXorigin = (index, i, images, viewport) => {
  // Compute xOrigin
  let xOrigin = 0;
  if (i - index.current === -2) {
    const [centralAdjustedWidth] = adjustedImageSize(
      images[pages[i + 2]],
      viewport,
      index.current,
      i
    );
    const centralXOffsetOrigin = (viewport.width - centralAdjustedWidth) / 2;
    const [adjustedWidth] = adjustedImageSize(
      images[pages[i]],
      viewport,
      index.current,
      i
    );
    const afterXOrigin = centralXOffsetOrigin - adjustedWidth - 10;
    const [afterAdjustedWidth] = adjustedImageSize(
      images[pages[i + 1]],
      viewport,
      index.current,
      i
    );
    xOrigin = afterXOrigin - afterAdjustedWidth - 10;
  } else if (i - index.current === -1) {
    const [centralAdjustedWidth] = adjustedImageSize(
      images[pages[i + 1]],
      viewport,
      index.current,
      i
    );
    const centralXOffsetOrigin = (viewport.width - centralAdjustedWidth) / 2;
    const [adjustedWidth] = adjustedImageSize(
      images[pages[i]],
      viewport,
      index.current,
      i
    );
    xOrigin = centralXOffsetOrigin - adjustedWidth - 10;
  } else if (i - index.current === 0) {
    const [adjustedWidth] = adjustedImageSize(
      images[pages[i]],
      viewport,
      index.current,
      i
    );
    const xOffsetOrigin = (viewport.width - adjustedWidth) / 2;
    xOrigin = (i - index.current) * viewport.width + xOffsetOrigin;
  } else if (i - index.current === 1) {
    const [centralAdjustedWidth] = adjustedImageSize(
      images[pages[i - 1]],
      viewport,
      index.current,
      i
    );
    const centralXOffsetOrigin = (viewport.width - centralAdjustedWidth) / 2;
    xOrigin = centralXOffsetOrigin + centralAdjustedWidth + 10;
  } else if (i - index.current === 2) {
    const [centralAdjustedWidth] = adjustedImageSize(
      images[pages[i - 2]],
      viewport,
      index.current,
      i
    );
    const centralXOffsetOrigin = (viewport.width - centralAdjustedWidth) / 2;
    const beforeXOrigin = centralXOffsetOrigin + centralAdjustedWidth + 10;
    const [beforeAdjustedWidth] = adjustedImageSize(
      images[pages[i - 1]],
      viewport,
      index.current,
      i
    );
    xOrigin = beforeXOrigin + beforeAdjustedWidth + 10;
  }
  return xOrigin;
};

function Viewpager(props) {
  const index = useRef(initialIndex);
  // console.log("props", props);

  const {
    state: { images, viewport, api, ready },
    springProps,
  } = props;

  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], cancel, tap }) => {
      // If the move in x direction is above a certain threshold,
      // update image to show

      // if (tap) {
      //   if (!document.fullscreenElement) {
      //     document.documentElement.requestFullscreen();
      //   } else {
      //     document.exitFullscreen();
      //   }
      // }

      // console.log("xDir", xDir);
      console.log("mx", mx);
      const thresholdMx = Math.min(viewport.width / 10, 150);
      if (active && thresholdMx < Math.abs(mx)) {
        const xIncrement = 0 < xDir ? -1 : 1;
        const toClamp = index.current + xIncrement;
        const lower = 0;
        const upper = pages.length - 1;
        index.current = clamp(toClamp, lower, upper);
        console.log("index.current", index.current);
        cancel();
      } else {
        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!isNextToCurrentImage(index.current, i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            // Compute xOrigin
            const xOrigin = computeXorigin(index, i, images, viewport);

            // Compute x animation
            const xOffset = active ? mx * 2 : 0;
            const x = xOrigin + xOffset;

            // Compute scale animation
            const animationPourcentage = Math.abs(mx) / thresholdMx;
            // const scaleOrigin = 1;
            const scaleOrigin = computeScaleFactor(index.current, i);
            let scaleTarget = 1;
            if (0 < mx) {
              scaleTarget = computeScaleFactor(index.current, i + 1);
            } else {
              scaleTarget = computeScaleFactor(index.current, i - 1);
            }
            // const scaleEffect = -animationPourcentage * 0.05;
            // const scale = active ? scaleOrigin + scaleEffect : scaleOrigin;
            const scaleEffective =
              (1 - animationPourcentage) * scaleOrigin +
              animationPourcentage * scaleTarget;
            if (i === index.current) {
              console.log("scaleOrigin", scaleOrigin);
              console.log("scaleTarget", scaleTarget);
              console.log("scaleEffective", scaleEffective);
            }
            const scale = active ? scaleEffective : scaleOrigin;

            // Compute color animation
            const nbColor = 5;
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
            return {
              x,
              scale,
              display: "block",
              backgroundColor: interpolateBackgroundColor,
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
      const slideDuration = 400;
      const resetDuration = 200;
      // const slideDuration = 10000;
      // const resetDuration = 1000;

      const animation = (xIncrement) => {
        // const xIncrement = 1;
        const toClamp = index.current + xIncrement;
        const lower = 0;
        const upper = pages.length - 1;
        index.current = clamp(toClamp, lower, upper);

        api.stop();

        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!isNextToCurrentImage(index.current, i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            // Compute xOrigin
            const xOrigin = computeXorigin(index, i, images, viewport);

            const transitionScale = 0.95;
            const interpolateBackgroundColor = "#555";
            return {
              to: {
                x: xOrigin,
                scale: transitionScale,
                display: "block",
                backgroundColor: interpolateBackgroundColor,
              },
              config: { duration: slideDuration },
            };
          }
        });

        api.start((i) => {
          if (!isNextToCurrentImage(index.current, i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            // Compute xOrigin
            const xOrigin = computeXorigin(index, i, images, viewport);

            return {
              to: {
                x: xOrigin,
                scale: 1,
                display: "block",
                backgroundColor: "#000",
              },
              delay: slideDuration,
              config: { duration: resetDuration },
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

  // console.log("In Viewpager images", images);

  if (!ready) {
    return "Just wait for it";
  } else {
    return (
      <div className="wrapper">
        {springProps.map(({ x, display, scale, backgroundColor }, i) => {
          let [adjustedWidth, adjustedHeight] = adjustedImageSize(
            images[pages[i]],
            viewport,
            index.current,
            i
          );

          // const scaleOrigin = ;

          // if (i === index.current) {
          //   console.log(
          //     "imageHeight / viewportHeight",
          //     images[pages[i]].height / viewport.height
          //   );
          //   console.log(
          //     "imageWidth / viewportWidtht",
          //     images[pages[i]].width / viewport.width
          //   );
          //   if (typeof window !== "undefined") {
          //     console.log("window.innerWidth", window.innerWidth);
          //     console.log("window.innerHeight", window.innerHeight);
          //   }
          // }
          // console.log("pages[i]", pages[i]);
          // console.log("condition", images[pages[i]] !== undefined);
          // console.log(
          //   "width",
          //   images[pages[i]] ? images[pages[i]].width : "not yet"
          // );
          return (
            <animated.div
              className="page"
              {...bind()}
              key={i}
              style={{
                display,
                x,
                // width:
                //   images[pages[i]] !== undefined
                //     ? `${getWidth(images[pages[i]])}px`
                //     : "80%",
              }}
            >
              <animated.div
                style={{
                  scale,
                  // backgroundImage: `url(${pages[i]})`,
                  backgroundColor,
                  // marginLeft: "10px",
                  // marginRight: "10px",
                  display: "flex",
                  alignItems: "center",
                  transformOrigin: "bottom center",
                }}
              >
                {/* <ImageNext
                src={`${pages[i]}`}
                alt="manga"
                unoptimized={true}
                layout="fill"
                objectFit="contain"
                style={{ position: "relative", width: "100%", height: "100%" }}
                onDragStart={(e) => {
                  e.preventDefault();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
              /> */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${pages[i]}`}
                  alt="manga"
                  width={adjustedWidth}
                  height={adjustedHeight}
                  // unoptimized={true}
                  // layout="fill"
                  // objectFit="contain"
                  style={{
                    position: "relative",
                    // width: "100%",

                    // width:
                    //   images[pages[i]] !== undefined
                    //     ? `${getWidth(images[pages[i]])}px`
                    //     : "100%",
                    // height: "100%",
                    // maxWidth: "100%",
                    // height: viewport.width < viewport.height ? "100%" : "unset",
                    // width: viewport.width < viewport.height ? "unset" : "100%",

                    marginLeft: "2px",
                    marginRight: "2px",
                    // overflow: "hidden",
                  }}
                  onDragStart={(e) => {
                    e.preventDefault();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                  }}
                />
              </animated.div>
            </animated.div>
          );
        })}
      </div>
    );
  }
}

function ViewpagerLoader() {
  const [state, setState] = React.useState({
    viewport: { width: 1280, height: 960 },
    images: {},
    ready: false,
    api: null,
  });

  const handleResize = React.useCallback(() => {
    if (
      state.viewport.width !== window.innerWidth ||
      state.viewport.height !== window.innerHeight
    ) {
      setState({
        ...state,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
    }
  }, [state]);

  React.useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [handleResize]);

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
  }, [state]);

  const [springProps, api] = useSprings(pages.length, (i) => {
    return {
      x: i * state.viewport.width,
      scale: 1,
      display: "block",
      backgroundColor: "#000",
    };
  });

  React.useEffect(() => {
    if (
      !state.ready &&
      pages.filter((pageURL) => state.images[pageURL] !== undefined).length ===
        pages.length
    ) {
      api.start((i) => {
        // console.log("useEffect i", i);
        // console.log("useEffect images", images);
        // console.log("useEffect images[pages[i]]", images[pages[i]]);
        // console.log("useEffect viewport.width", viewport.width);

        if (!isNextToCurrentImage(initialIndex, i)) {
          return {
            display: "none",
            backgroundColor: "#000",
          };
        } else {
          const xOrigin = computeXorigin(
            { current: initialIndex },
            i,
            state.images,
            state.viewport
          );
          const scaleFactor = computeScaleFactor(initialIndex, i);
          return {
            from: {
              x: xOrigin,
              scale: scaleFactor,
              display: "block",
              backgroundColor: "#000",
            },
            // immediat: true,
          };
        }
      });

      setState({ ...state, api: api, ready: true });
    }
  }, [api, state]);

  return <Viewpager state={state} springProps={springProps} />;
}

export default function App() {
  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="./styles.module.css" media="all" />
      </Head>
      <div className="flex fill center">
        {/* <Viewpager /> */}
        <ViewpagerLoader />
      </div>
    </>
  );
}
