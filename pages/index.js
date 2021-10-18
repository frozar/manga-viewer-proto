import React, { useRef } from "react";
import Head from "next/head";
// import * as ImageNext from "next/image";
import ImageNext from "next/image";
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

const images = {};
const landscape = 0;
const portrait = 1;

function Viewpager() {
  const index = useRef(0);
  let width = 800;
  if (typeof window !== "undefined") {
    width = window.innerWidth;
  }

  React.useEffect(() => {
    for (const pageURL of pages) {
      // images[pageURL] = new Image();
      // images[pageURL].src = pageURL;
      console.log("pageURL", pageURL);
      const img = new Image();
      img.src = pageURL;
      images[pageURL] = img;
      // console.log("img.width", img.width);
      // console.log("img.height", img.height);
      // if (img.width < img.height) {
      //   images[pageURL] = portrait;
      // } else {
      //   images[pageURL] = landscape;
      // }
    }
  }, []);

  const [springProps, api] = useSprings(pages.length, (i) => ({
    x: i * width,
    scale: 1,
    display: "block",
    backgroundColor: "#000",
  }));

  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], cancel }) => {
      // If the move in x direction is above a certain threshold,
      // update image to show
      if (active && width / 4 < Math.abs(mx)) {
        const xIncrement = 0 < xDir ? -1 : 1;
        const toClamp = index.current + xIncrement;
        const lower = 0;
        const upper = pages.length - 1;
        index.current = clamp(toClamp, lower, upper);
        cancel();
      } else {
        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!(index.current - 1 <= i && i <= index.current + 1)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            const xOrigin = (i - index.current) * width;
            const xOffset = (active ? mx : 0) * 3;
            const x = xOrigin + xOffset;
            const scaleOrigin = 1;
            const scaleEffect = -Math.abs(mx) / width / 1.5;
            const scale = active ? scaleOrigin + scaleEffect : 1;
            const interpolationPourcentage = Math.abs(mx) / (width / 4);
            const nbColor = 5;
            const interpolationQuantum = 1 / nbColor;
            const colorIndex = Math.ceil(
              interpolationPourcentage / interpolationQuantum
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

        const isNextToCurrentImage = (i) => {
          const neighbourhood = 3;
          return (
            index.current - neighbourhood <= i &&
            i <= index.current + neighbourhood
          );
        };

        api.start((i) => {
          // If image is not next the to current image, don't display
          if (!isNextToCurrentImage(i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            const xOrigin = (i - index.current) * width;
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
          if (!isNextToCurrentImage(i)) {
            return {
              display: "none",
              backgroundColor: "#000",
            };
          } else {
            const xOrigin = (i - index.current) * width;
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
    [api, width]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="wrapper">
      {springProps.map(({ x, display, scale, backgroundColor }, i) => (
        <animated.div
          className="page"
          {...bind()}
          key={i}
          style={{ display, x }}
        >
          <animated.div
            style={{
              scale,
              // backgroundImage: `url(${pages[i]})`,
              backgroundColor,
            }}
          >
            <ImageNext
              src={`${pages[i]}`}
              alt="manga"
              unoptimized={true}
              // style={{ height: "inherit" }}
              layout="fill"
              // width={300}
              // height={400}
              // objectPosition="center center"
              objectFit="contain"
              // objectFit="cover"
              // objectFit="fill"
              // objectFit="none"
              // objectFit="scale-down"
              // objectFit="inherit"
              // objectFit="initial"
              // objectFit="revert"
              // objectFit="unset"
              // layout="intrinsic"
              // width={300}
              // height={400}
              // objectPosition="center center"
              // width={images[pages[i]].width}
              // height={images[pages[i]].height}
              // layout="responsive"
              // sizes="10vw"
              onDragStart={(e) => {
                e.preventDefault();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
              }}
            />
          </animated.div>
        </animated.div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="./styles.module.css" media="all" />
      </Head>
      <div className="flex fill center">
        <Viewpager />
      </div>
    </>
  );
}
