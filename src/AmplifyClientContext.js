import React, { createContext, useContext } from "react";

// Context for Amplify Data client
const AmplifyClientContext = createContext(null);

export const AmplifyClientProvider = ({ client, children }) => (
  <AmplifyClientContext.Provider value={client}>{children}</AmplifyClientContext.Provider>
);

export const useAmplifyClient = () => {
  const ctx = useContext(AmplifyClientContext);
  if (!ctx) throw new Error("Amplify client not found in context");
  return ctx;
};