import React, { useEffect, useState } from "react";
import "./App.css";
import { useAsyncResource, AsyncResourceBag } from "./useAsyncResource";

type User = {
  id: number;
  name: string;
  location: string;
};

const getUsers = ({ getCurrentState }: AsyncResourceBag<User[]>) => async (
  page: number
): Promise<User[]> => {
  const users = await fetch(`/users?_page=${page}`).then(res => res.json());
  const storedUsers = getCurrentState();
  return storedUsers ? [...storedUsers, ...users] : users;
};

const addUser = ({
  getCurrentState,
  setState
}: AsyncResourceBag<User[]>) => async (user: User): Promise<User[]> => {
  setState((users: User[]) => {
    return [...users, { ...(user as User), id: -Math.random() }];
  });
  const resp = await fetch("/users", {
    body: JSON.stringify(user),
    method: "POST"
  });
  const res: Partial<User> = await resp.json();
  const finalUser: User = { ...user, ...res };
  const storedUsers = getCurrentState();
  if (storedUsers == null) {
    return [user];
  }
  return [...storedUsers, finalUser].filter(({ id }) => id >= 0);
};

function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [userResource, actions] = useAsyncResource<
    User[],
    {
      get: typeof getUsers;
      add: typeof addUser;
    }
  >({
    actions: {
      get: getUsers,
      add: addUser
    }
  });
  useEffect(() => {
    actions.get(currentPage);
  }, [currentPage]);
  return (
    <div>
      <pre>{JSON.stringify(userResource, null, 4)}</pre>
      <br />
      <br />
      <button onClick={() => setCurrentPage(x => x + 1)}>Load more</button>
      <button onClick={() => actions.add({ name: "John", location: "Sydney" })}>
        Add
      </button>
    </div>
  );
}

export default App;
