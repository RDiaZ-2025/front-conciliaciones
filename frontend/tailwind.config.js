/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./noc/src/**/*.{html,ts}",
        "./src/**/*.{html,ts}"
    ],
    theme: {
        extend: {
            colors: {
                primary: 'hsl(355, 100%, 60%)',
                secondary: 'hsl(355, 100%, 45%)',
            }
        },
    },
    plugins: [],
}
