/**
 * @module integrations
 * @description Exports integrations with popular libraries.
 */

export { default as createReactQueryErrorHandler } from './react-query';
export { default as createSWRErrorHandler } from './swr';

// For future expansions:
// export { default as createApolloErrorHandler } from './apollo';
// export { default as createReduxThunkErrorHandler } from './redux-thunk';