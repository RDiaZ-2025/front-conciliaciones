import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

const ClaroPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#FEF5F4',
            100: '#FDEBEA',
            200: '#FBCDCA',
            300: '#F8AFA9',
            400: '#F37469',
            500: '#EE3829',
            600: '#D63225',
            700: '#A7271D',
            800: '#831F17',
            900: '#5F1610',
            950: '#300B08'
        },
        colorScheme: {
            light: {
                surface: {
                    0: '#ffffff',
                    50: '{zinc.50}',
                    100: '{zinc.100}',
                    200: '{zinc.200}',
                    300: '{zinc.300}',
                    400: '{zinc.400}',
                    500: '{zinc.500}',
                    600: '{zinc.600}',
                    700: '{zinc.700}',
                    800: '{zinc.800}',
                    900: '{zinc.900}',
                    950: '{zinc.950}'
                }
            },
            dark: {
                surface: {
                    0: '#ffffff',
                    50: '{slate.50}',
                    100: '{slate.100}',
                    200: '{slate.200}',
                    300: '{slate.300}',
                    400: '{slate.400}',
                    500: '{slate.500}',
                    600: '{slate.600}',
                    700: '{slate.700}',
                    800: '{slate.800}',
                    900: '{slate.900}',
                    950: '{slate.950}'
                }
            }
        }
    }
});

export { ClaroPreset };
