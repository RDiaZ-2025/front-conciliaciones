import React from "react";
import { Box, IconButton, Switch, Avatar } from "@mui/material";
import { LightMode, DarkMode } from "@mui/icons-material";
import claroMediaLogo2 from "../assets/CLARO_MEDIA_2_converted.jpg";

export default function DarkModeToggle({ darkMode, setDarkMode, onLogoClick, hideLogo = false }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: theme => theme.spacing(1.5) }}>
      {!hideLogo && (
        <IconButton
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            }
          }}
          aria-label="Claro Media"
          sx={{
            p: 0,
            border: theme => `2px solid ${darkMode ? theme.palette.secondary.main : theme.palette.divider}`,
            transition: theme => theme.transitions.create(['border-color'], {
              duration: theme.transitions.duration.standard,
            })
          }}
        >
          <Avatar
            src={claroMediaLogo2}
            alt="Claro Media"
            sx={{
              width: theme => theme.spacing(5),
              height: theme => theme.spacing(5)
            }}
          />
        </IconButton>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          width: theme => theme.spacing(8),
          height: theme => theme.spacing(4),
          borderRadius: theme => theme.spacing(4),
          bgcolor: darkMode ? 'secondary.main' : 'grey.200',
          boxShadow: theme => darkMode ? theme.shadows[2] : theme.shadows[1],
          cursor: "pointer",
          transition: theme => theme.transitions.create(['background-color', 'box-shadow'], {
            duration: theme.transitions.duration.standard,
          }),
          '&:hover': {
            boxShadow: theme => theme.shadows[4]
          }
        }}
        onClick={() => setDarkMode(dm => !dm)}
        role="button"
        aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
      >
        <Box
          sx={{
            position: "absolute",
            left: theme => darkMode ? theme.spacing(4) : theme.spacing(0.5),
            top: "50%",
            transform: "translateY(-50%)",
            width: theme => theme.spacing(3.5),
            height: theme => theme.spacing(3.5),
            borderRadius: "50%",
            bgcolor: "common.white",
            boxShadow: theme => theme.shadows[2],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: theme => theme.transitions.create(['left'], {
              duration: theme.transitions.duration.standard,
            })
          }}
        >
          {darkMode ? (
            <DarkMode sx={{ color: 'secondary.main', fontSize: 20 }} />
          ) : (
            <LightMode sx={{ color: 'warning.main', fontSize: 20 }} />
          )}
        </Box>
      </Box>
    </Box>
  );
}