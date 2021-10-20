import React from "react";
import Drawer from "@mui/material/Drawer";
import Grid from "@mui/material/Grid";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  components: {
    MuiModal: {
      styleOverrides: {
        root: {
          top: "auto",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255,255,255, 0.5)",
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          width: "3em",
          height: "3em",
        },
      },
    },
  },
});

export default function ControlBar() {
  const drawerShowDuration = 1000;
  const timeout_id = React.useRef(null);
  const [showDrawer, setShowDrawer] = React.useState({ value: false });

  const handleMouseMove = React.useCallback(() => {
    if (!showDrawer.value) {
      setShowDrawer({ value: true });
    }

    if (timeout_id.current !== null) {
      clearTimeout(timeout_id.current);
    }
    timeout_id.current = setTimeout(() => {
      setShowDrawer({ value: false });
      timeout_id.current = null;
    }, drawerShowDuration);
  }, [showDrawer]);

  // On a mouse move, display control bar
  React.useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <ThemeProvider theme={theme}>
      <Drawer anchor="bottom" open={showDrawer.value} hideBackdrop={true}>
        <Grid container direction="row" justifyContent="center">
          <Grid item>
            {document.fullscreenElement ? (
              <FullscreenExitIcon
                onClick={() => {
                  document.exitFullscreen();
                }}
              />
            ) : (
              <FullscreenIcon
                onClick={() => {
                  if (
                    document.documentElement.requestFullscreen !== undefined
                  ) {
                    document.documentElement.requestFullscreen();
                  }
                }}
              />
            )}
          </Grid>
        </Grid>
      </Drawer>
    </ThemeProvider>
  );
}
