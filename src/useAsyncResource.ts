import { useState } from 'react';

type GetCurrentState<T> = () => T | null;

export type AsyncResourceBag<T> = {
  getCurrentState: GetCurrentState<T>;
  setState: (cb: (state: T) => T) => void;
};

type AsyncResourceConfig<T, K> = {
  actions: Record<
    keyof K,
    (config: AsyncResourceBag<T>) => (...args: any[]) => T | Promise<T>
  >;
  initialState?: T;
};

type AsyncStateNotAsked = {
  type: 'not_asked';
};

type AsyncStateRunning = {
  type: 'running';
};

type AsyncStateReRunning<T> = {
  type: 'rerunning';
  action: string;
  data: T;
};

type AsyncStateResolved<T> = {
  type: 'resolved';
  data: T;
};

type AsyncStateError = {
  type: 'rejected';
  error: Error;
};

type AsyncState<T> =
  | AsyncStateNotAsked
  | AsyncStateRunning
  | AsyncStateReRunning<T>
  | AsyncStateResolved<T>
  | AsyncStateError;

type UserActions<T, K> = {
  [P in keyof K]: (...args: any[]) => T | Promise<T>;
};

type AsyncResourceReturnType<T, K> = [AsyncState<T>, UserActions<T, K>];

export function useAsyncResource<T, K>({
  actions,
  initialState,
}: AsyncResourceConfig<T, K>): AsyncResourceReturnType<T, K> {
  const [state, setState] = useState<AsyncState<T>>(() =>
    initialState
      ? { type: 'resolved', data: initialState }
      : { type: 'not_asked' }
  );

  const setLoading = (key: string) => {
    setState(currentState => {
      if (currentState.type === 'resolved') {
        return {
          type: 'rerunning',
          action: key,
          data: currentState.data,
        };
      }
      return { type: 'running' };
    });
  };

  const setResolved = (data: T) => setState(() => ({ type: 'resolved', data }));

  const getCurrentState = (): T | null => {
    if (state.type === 'resolved') {
      return state.data;
    }
    return null;
  };

  const actionsList: Array<[
    string,
    (config: AsyncResourceBag<T>) => (...args: any[]) => T | Promise<T>
  ]> = Object.entries(actions);

  const actionsWithAsyncBag = actionsList.map(([key, cb]) => {
    const fnWithInjectedAsyncBag = cb({
      getCurrentState,
      setState: cb =>
        setState(currentState => {
          if (
            currentState.type === 'resolved' ||
            currentState.type === 'rerunning'
          ) {
            return {
              ...currentState,
              data: cb(currentState.data),
            };
          }
          return currentState;
        }),
    });
    return [
      key,
      async (...args: any[]) => {
        setLoading(key);
        try {
          const response: T = await fnWithInjectedAsyncBag(...args);
          setResolved(response);
        } catch (error) {}
      },
    ];
  });

  const userActions: UserActions<T, K> = Object.fromEntries(
    actionsWithAsyncBag
  );

  return [state, userActions];
}
