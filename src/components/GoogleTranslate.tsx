import { type FC, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
  }
}

// Custom hook to create cookie for Google Translate
const useGoogleTranslateCookie = (): void => {
  useEffect(() => {
    const setCookie = (name: string, value: string, days: number): void => {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
    };

    // Default: keep English → English (no translation until user picks)
    // setCookie('googtrans', '/en/en', 1);
    document.cookie =
      'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }, []);
};

const GoogleTranslate: FC = () => {
  const translateElementRef = useRef<HTMLDivElement>(null);
  useGoogleTranslateCookie();

  useEffect(() => {
    // Clear any previous instance
    const element = document.getElementById('google_translate_element');
    if (element) element.innerHTML = '';

    const initGoogleTranslate = (): void => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,fr,es',
            autoDisplay: false,
            multilanguagePage: true,
          },
          'google_translate_element'
        );

        // Fix for English selection
        setTimeout(() => {
          const selectElement = document.querySelector(
            '.goog-te-combo'
          ) as HTMLSelectElement;
          if (selectElement) {
            selectElement.addEventListener('change', (event) => {
              const target = event.target as HTMLSelectElement;
              if (target.value === 'en') {
                const contentElement = document.querySelector(
                  '.goog-te-banner-frame'
                ) as HTMLIFrameElement;
                if (contentElement?.contentWindow) {
                  const restoreButton =
                    contentElement.contentWindow.document.querySelector(
                      'button[id*="restore"]'
                    ) as HTMLButtonElement;
                  restoreButton?.click();
                }
              }
            });
          }
        }, 1000);
      } else {
        // Retry if script hasn’t finished attaching TranslateElement
        setTimeout(initGoogleTranslate, 200);
      }
    };

    // Expose init globally for Google’s script callback
    window.googleTranslateElementInit = initGoogleTranslate;

    // Inject Google Translate script once
    if (!document.querySelector('script[src*="translate_a/element.js"]')) {
      const script = document.createElement('script');
      script.src =
        '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else {
      // If already loaded, just try init again
      setTimeout(initGoogleTranslate, 100);
    }

    return (): void => {
      if (element) element.innerHTML = '';
    };
  }, []);

  return (
    <Box
      id="google_translate_element"
      ref={translateElementRef}
      sx={{
        position: 'relative',
        '& .goog-te-combo': {
          p: 1,
          borderRadius: 1,
          width: '100%',
          borderColor: 'divider',
          WebkitAppearance: 'none',
          appearance: 'none',
        },
        '&::after': {
          content: '"\u2304"',
          fontSize: '20px',
          top: 0,
          right: '10px',
          position: 'absolute',
        },
      }}
    />
  );
};

export default GoogleTranslate;
