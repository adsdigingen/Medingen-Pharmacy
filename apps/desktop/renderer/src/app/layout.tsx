import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "../components/common/ToastProvider";

export const metadata: Metadata = {
  title: "Medingen Pharmacy ERP",
  description: "Medingen Pharmacy Enterprise Resource Planning System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Instant splash screen rendered as raw HTML before ANY JS loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          #app-loader {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #020617;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            font-family: 'Inter', system-ui, sans-serif;
            font-size: 12px;
            color: #94a3b8;
            transition: opacity 0.3s ease;
          }
          #app-loader.hidden {
            opacity: 0;
            pointer-events: none;
          }
          #app-loader svg {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
        {/* Script runs synchronously: exposes hideAppLoader() for page.tsx to call */}
        <script dangerouslySetInnerHTML={{ __html: `
          console.log("[Layout Loader] Registering window.hideAppLoader");
          window.hideAppLoader = function() {
            console.log("[Layout Loader] hideAppLoader invoked");
            var el = document.getElementById('app-loader');
            if (el) {
              console.log("[Layout Loader] Removing #app-loader element");
              el.classList.add('hidden');
              setTimeout(function() { el.remove(); }, 350);
            } else {
              console.warn("[Layout Loader] #app-loader element not found!");
            }
          };

          window.logTrace = function(msg) {
            console.log(msg);
            var traceEl = document.getElementById('startup-trace-log');
            if (traceEl) {
              traceEl.innerHTML += msg + '<br/>';
              traceEl.scrollTop = traceEl.scrollHeight;
            }
          };

          console.log("[Layout] Startup trace initialized.");
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-background" style={{ fontFamily: "'Open Sans', system-ui, sans-serif" }}>
        {/* Instant splash: visible immediately, before React hydrates */}
        <div id="app-loader">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#14b8a6" strokeWidth="4" strokeOpacity="0.25" />
            <path fill="#14b8a6" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Initializing Medingen ERP desk environment...</span>
          <div id="startup-trace-log" style={{
            marginTop: '15px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#4ade80',
            maxHeight: '200px',
            overflowY: 'auto',
            textAlign: 'left',
            width: '80%',
            borderTop: '1px solid #1e293b',
            paddingTop: '10px',
            whiteSpace: 'pre-wrap',
          }}></div>
        </div>

        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
