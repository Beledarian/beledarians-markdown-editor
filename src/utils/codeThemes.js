import {
    vscDarkPlus,
    vs,
    dracula,
    atomDark,
    ghcolors,
    okaidia,
    solarizedlight,
    solarizedDarkAtom
} from 'react-syntax-highlighter/dist/esm/styles/prism';

export const themes = {
    'VS Code Dark': vscDarkPlus,
    'VS Code Light': vs,
    'Dracula': dracula,
    'Atom Dark': atomDark,
    'GitHub': ghcolors,
    'Monokai': okaidia,
    'Solarized Light': solarizedlight,
    'Solarized Dark': solarizedDarkAtom
};

export const themeNames = Object.keys(themes);
