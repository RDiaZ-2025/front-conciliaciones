import React from "react";
import claroMediaLogo2 from "../assets/CLARO_MEDIA_2_converted.jpg";

export default function DarkModeToggle({ darkMode, setDarkMode, onLogoClick, hideLogo = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {/* Botón con logo de Claro Media - solo se muestra si hideLogo es false */}
      {!hideLogo && (
        <button
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: darkMode ? "#E60026" : "#ddd",
            background: "transparent",
            cursor: "pointer",
            transition: "all 0.3s",
            padding: 0,
            overflow: "hidden"
          }}
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            }
          }}
          aria-label="Claro Media"
        >
          <img
            src={claroMediaLogo2}
            alt="Claro Media"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%"
            }}
          />
        </button>
      )}

      {/* Toggle de modo oscuro/claro */}
      <button
        onClick={() => setDarkMode(dm => !dm)}
        aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          width: 64,
          height: 32,
          borderRadius: 32,
          border: "none",
          background: darkMode ? "#E60026" : "#F1F5FB",
          boxShadow: darkMode ? "0 2px 8px #E6002633" : "0 2px 8px #1976d220",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.3s, box-shadow 0.3s"
        }}
      >
      <span style={{
        position: "absolute",
        left: darkMode ? 32 : 4,
        top: "50%",
        transform: "translateY(-50%)",
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 2px 8px #0002",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "left 0.3s"
      }}>
        {darkMode ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E60026" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F39C12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </span>
    </button>
    </div>
  );
}