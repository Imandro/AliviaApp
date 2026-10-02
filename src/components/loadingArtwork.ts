import symbolFallback from '../assets/loading-symbol.png';
import signatureFallback from '../assets/loading-signature.png';

// Reutiliza las imágenes del HTML inicial sin repetir sus bytes en el bundle.
const initialSymbol = document.querySelector('#app-preloader .brand-fill')?.getAttribute('href');
const initialSignature = document.querySelector('#app-preloader .brand-signature')?.getAttribute('src');
export const loadingSymbol = initialSymbol || symbolFallback;
export const loadingSignature = initialSignature || signatureFallback;
