import preact from 'eslint-config-preact';

let config = [...preact];
config[0] = Object.assign({'files': ["**/*.jsx"]}, config[0]);

export default config;