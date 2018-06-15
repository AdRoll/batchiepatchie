export default function actionReducer(ACTION_HANDLERS, initialState) {
  return function reducer(state = initialState, action) {
    const handler = ACTION_HANDLERS[action && action.type];
    return handler ? handler(state, action) : state;
  };
}
